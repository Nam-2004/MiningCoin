/* eslint-disable */ 
var Module = {
  print: function() {
    return function(text) {
      if (arguments.length > 1) {
        text = Array.prototype.slice.call(arguments).join(' ');
      }
      console.log(text);
    };
  },
  printErr: function(text) {
    if (arguments.length > 1) {
      text = Array.prototype.slice.call(arguments).join(' ');
    }
    console.error(text);
  },
  ready: false,
  monitorRunDependencies: function(left) {
    if (left == 0) {
      this.ready = true;
    }
  }
};
var Module = typeof Module !== "undefined" ? Module : {};
var moduleOverrides = {};
var key;
for (key in Module) {
    if (Module.hasOwnProperty(key)) {
        moduleOverrides[key] = Module[key]
    }
}
var arguments_ = [];
var thisProgram = "./this.program";
var quit_ = function(status, toThrow) {
    throw toThrow
};
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
ENVIRONMENT_IS_WEB = typeof window === "object";
ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
ENVIRONMENT_IS_NODE = typeof process === "object" && typeof process.versions === "object" && typeof process.versions.node === "string";
ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
var scriptDirectory = "";

function locateFile(path) {
    if (Module["locateFile"]) {
        return Module["locateFile"](path, scriptDirectory)
    }
    return scriptDirectory + path
}
var read_, readAsync, readBinary, setWindowTitle;
var nodeFS;
var nodePath;
if (ENVIRONMENT_IS_NODE) {
    if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = require("path").dirname(scriptDirectory) + "/"
    } else {
        scriptDirectory = __dirname + "/"
    }
    read_ = function shell_read(filename, binary) {
        if (!nodeFS) nodeFS = require("fs");
        if (!nodePath) nodePath = require("path");
        filename = nodePath["normalize"](filename);
        return nodeFS["readFileSync"](filename, binary ? null : "utf8")
    };
    readBinary = function readBinary(filename) {
        var ret = read_(filename, true);
        if (!ret.buffer) {
            ret = new Uint8Array(ret)
        }
        assert(ret.buffer);
        return ret
    };
    if (process["argv"].length > 1) {
        thisProgram = process["argv"][1].replace(/\\/g, "/")
    }
    arguments_ = process["argv"].slice(2);
    if (typeof module !== "undefined") {
        module["exports"] = Module
    }
    process["on"]("uncaughtException", function(ex) {
        if (!(ex instanceof ExitStatus)) {
            throw ex
        }
    });
    process["on"]("unhandledRejection", abort);
    quit_ = function(status) {
        process["exit"](status)
    };
    Module["inspect"] = function() {
        return "[Emscripten Module object]"
    }
} else if (ENVIRONMENT_IS_SHELL) {
    if (typeof read != "undefined") {
        read_ = function shell_read(f) {
            return read(f)
        }
    }
    readBinary = function readBinary(f) {
        var data;
        if (typeof readbuffer === "function") {
            return new Uint8Array(readbuffer(f))
        }
        data = read(f, "binary");
        assert(typeof data === "object");
        return data
    };
    if (typeof scriptArgs != "undefined") {
        arguments_ = scriptArgs
    } else if (typeof arguments != "undefined") {
        arguments_ = arguments
    }
    if (typeof quit === "function") {
        quit_ = function(status) {
            quit(status)
        }
    }
    if (typeof print !== "undefined") {
        if (typeof console === "undefined") console = {};
        console.log = print;
        console.warn = console.error = typeof printErr !== "undefined" ? printErr : print
    }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = self.location.href
    } else if (typeof document !== "undefined" && document.currentScript) {
        scriptDirectory = document.currentScript.src
    }
    if (scriptDirectory.indexOf("blob:") !== 0) {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf("/") + 1)
    } else {
        scriptDirectory = ""
    } {
        read_ = function shell_read(url) {
            var xhr = new XMLHttpRequest;
            xhr.open("GET", url, false);
            xhr.send(null);
            return xhr.responseText
        };
        if (ENVIRONMENT_IS_WORKER) {
            readBinary = function readBinary(url) {
                var xhr = new XMLHttpRequest;
                xhr.open("GET", url, false);
                xhr.responseType = "arraybuffer";
                xhr.send(null);
                return new Uint8Array(xhr.response)
            }
        }
        readAsync = function readAsync(url, onload, onerror) {
            var xhr = new XMLHttpRequest;
            xhr.open("GET", url, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = function xhr_onload() {
                if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                    onload(xhr.response);
                    return
                }
                onerror()
            };
            xhr.onerror = onerror;
            xhr.send(null)
        }
    }
    setWindowTitle = function(title) {
        document.title = title
    }
} else {}
var out = Module["print"] || console.log.bind(console);
var err = Module["printErr"] || console.warn.bind(console);
for (key in moduleOverrides) {
    if (moduleOverrides.hasOwnProperty(key)) {
        Module[key] = moduleOverrides[key]
    }
}
moduleOverrides = null;
if (Module["arguments"]) arguments_ = Module["arguments"];
if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
if (Module["quit"]) quit_ = Module["quit"];
var STACK_ALIGN = 16;

function alignMemory(size, factor) {
    if (!factor) factor = STACK_ALIGN;
    return Math.ceil(size / factor) * factor
}
var wasmBinary;
if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
var noExitRuntime;
if (Module["noExitRuntime"]) noExitRuntime = Module["noExitRuntime"];
if (typeof WebAssembly !== "object") {
    abort("no native wasm support detected")
}
var wasmMemory;
var ABORT = false;
var EXITSTATUS;

function assert(condition, text) {
    if (!condition) {
        abort("Assertion failed: " + text)
    }
}

function getCFunc(ident) {
    var func = Module["_" + ident];
    assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
    return func
}

function ccall(ident, returnType, argTypes, args, opts) {
    var toC = {
        "string": function(str) {
            var ret = 0;
            if (str !== null && str !== undefined && str !== 0) {
                var len = (str.length << 2) + 1;
                ret = stackAlloc(len);
                stringToUTF8(str, ret, len)
            }
            return ret
        },
        "array": function(arr) {
            var ret = stackAlloc(arr.length);
            writeArrayToMemory(arr, ret);
            return ret
        }
    };

    function convertReturnValue(ret) {
        if (returnType === "string") return UTF8ToString(ret);
        if (returnType === "boolean") return Boolean(ret);
        return ret
    }
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    if (args) {
        for (var i = 0; i < args.length; i++) {
            var converter = toC[argTypes[i]];
            if (converter) {
                if (stack === 0) stack = stackSave();
                cArgs[i] = converter(args[i])
            } else {
                cArgs[i] = args[i]
            }
        }
    }
    var ret = func.apply(null, cArgs);
    ret = convertReturnValue(ret);
    if (stack !== 0) stackRestore(stack);
    return ret
}

function cwrap(ident, returnType, argTypes, opts) {
    argTypes = argTypes || [];
    var numericArgs = argTypes.every(function(type) {
        return type === "number"
    });
    var numericRet = returnType !== "string";
    if (numericRet && numericArgs && !opts) {
        return getCFunc(ident)
    }
    return function() {
        return ccall(ident, returnType, argTypes, arguments, opts)
    }
}
var UTF8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;

function UTF8ArrayToString(heap, idx, maxBytesToRead) {
    var endIdx = idx + maxBytesToRead;
    var endPtr = idx;
    while (heap[endPtr] && !(endPtr >= endIdx)) ++endPtr;
    if (endPtr - idx > 16 && heap.subarray && UTF8Decoder) {
        return UTF8Decoder.decode(heap.subarray(idx, endPtr))
    } else {
        var str = "";
        while (idx < endPtr) {
            var u0 = heap[idx++];
            if (!(u0 & 128)) {
                str += String.fromCharCode(u0);
                continue
            }
            var u1 = heap[idx++] & 63;
            if ((u0 & 224) == 192) {
                str += String.fromCharCode((u0 & 31) << 6 | u1);
                continue
            }
            var u2 = heap[idx++] & 63;
            if ((u0 & 240) == 224) {
                u0 = (u0 & 15) << 12 | u1 << 6 | u2
            } else {
                u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heap[idx++] & 63
            }
            if (u0 < 65536) {
                str += String.fromCharCode(u0)
            } else {
                var ch = u0 - 65536;
                str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
            }
        }
    }
    return str
}

function UTF8ToString(ptr, maxBytesToRead) {
    return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : ""
}

function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
    if (!(maxBytesToWrite > 0)) return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) {
            var u1 = str.charCodeAt(++i);
            u = 65536 + ((u & 1023) << 10) | u1 & 1023
        }
        if (u <= 127) {
            if (outIdx >= endIdx) break;
            heap[outIdx++] = u
        } else if (u <= 2047) {
            if (outIdx + 1 >= endIdx) break;
            heap[outIdx++] = 192 | u >> 6;
            heap[outIdx++] = 128 | u & 63
        } else if (u <= 65535) {
            if (outIdx + 2 >= endIdx) break;
            heap[outIdx++] = 224 | u >> 12;
            heap[outIdx++] = 128 | u >> 6 & 63;
            heap[outIdx++] = 128 | u & 63
        } else {
            if (outIdx + 3 >= endIdx) break;
            heap[outIdx++] = 240 | u >> 18;
            heap[outIdx++] = 128 | u >> 12 & 63;
            heap[outIdx++] = 128 | u >> 6 & 63;
            heap[outIdx++] = 128 | u & 63
        }
    }
    heap[outIdx] = 0;
    return outIdx - startIdx
}

function stringToUTF8(str, outPtr, maxBytesToWrite) {
    return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
}

function lengthBytesUTF8(str) {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
        if (u <= 127) ++len;
        else if (u <= 2047) len += 2;
        else if (u <= 65535) len += 3;
        else len += 4
    }
    return len
}

function writeArrayToMemory(array, buffer) {
    HEAP8.set(array, buffer)
}
var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

function updateGlobalBufferAndViews(buf) {
    buffer = buf;
    Module["HEAP8"] = HEAP8 = new Int8Array(buf);
    Module["HEAP16"] = HEAP16 = new Int16Array(buf);
    Module["HEAP32"] = HEAP32 = new Int32Array(buf);
    Module["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
    Module["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
    Module["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
    Module["HEAPF32"] = HEAPF32 = new Float32Array(buf);
    Module["HEAPF64"] = HEAPF64 = new Float64Array(buf)
}
var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 16777216;
var wasmTable;
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;

function preRun() {
    if (Module["preRun"]) {
        if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
        while (Module["preRun"].length) {
            addOnPreRun(Module["preRun"].shift())
        }
    }
    callRuntimeCallbacks(__ATPRERUN__)
}

function initRuntime() {
    runtimeInitialized = true;
    if (!Module["noFSInit"] && !FS.init.initialized) FS.init();
    TTY.init();
    callRuntimeCallbacks(__ATINIT__)
}

function preMain() {
    FS.ignorePermissions = false;
    callRuntimeCallbacks(__ATMAIN__)
}

function postRun() {
    if (Module["postRun"]) {
        if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
        while (Module["postRun"].length) {
            addOnPostRun(Module["postRun"].shift())
        }
    }
    callRuntimeCallbacks(__ATPOSTRUN__)
}

function addOnPreRun(cb) {
    __ATPRERUN__.unshift(cb)
}

function addOnPostRun(cb) {
    __ATPOSTRUN__.unshift(cb)
}
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;

function getUniqueRunDependency(id) {
    return id
}

function addRunDependency(id) {
    runDependencies++;
    if (Module["monitorRunDependencies"]) {
        Module["monitorRunDependencies"](runDependencies)
    }
}

function removeRunDependency(id) {
    runDependencies--;
    if (Module["monitorRunDependencies"]) {
        Module["monitorRunDependencies"](runDependencies)
    }
    if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null
        }
        if (dependenciesFulfilled) {
            var callback = dependenciesFulfilled;
            dependenciesFulfilled = null;
            callback()
        }
    }
}
Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};

function abort(what) {
    if (Module["onAbort"]) {
        Module["onAbort"](what)
    }
    what += "";
    err(what);
    ABORT = true;
    EXITSTATUS = 1;
    what = "abort(" + what + "). Build with -s ASSERTIONS=1 for more info.";
    var e = new WebAssembly.RuntimeError(what);
    throw e
}

function hasPrefix(str, prefix) {
    return String.prototype.startsWith ? str.startsWith(prefix) : str.indexOf(prefix) === 0
}
var dataURIPrefix = "data:application/octet-stream;base64,";

function isDataURI(filename) {
    return hasPrefix(filename, dataURIPrefix)
}
var fileURIPrefix = "file://";

function isFileURI(filename) {
    return hasPrefix(filename, fileURIPrefix)
}
var wasmBinaryFile = "wasmminer.wasm";
if (!isDataURI(wasmBinaryFile)) {
    wasmBinaryFile = locateFile(wasmBinaryFile)
}
var wasmBase64 = "AGFzbQEAAAABxwEeYAN/f38AYAF/AX9gAn9/AGADf39/AX9gAn9/AX9gBX9+fn5+AGAEf39/fwBgBX9/f39/AGAGf39/f39/AGAFf39/f38Bf2AEf35+fwBgAX8AYAJ/fABgBH9/f38Bf2ACfn8Bf2ABfwF+YAF/AXxgAABgB39/f39/f38AYAN/fn4AYAJ/fQBgAAF/YAZ/f39/f38Bf2AGf3x/f39/AX9gA35/fwF/YAJ+fgF/YAN+fn4Bf2AEfn5+fgF/YAJ/fwF+YAJ+fgF8Ah8FAWEBYQABAWEBYgADAWEBYwAWAWEBZAAEAWEBZQAGA1hXAwUBBgoFAgAMEwEbBwkCAAAAAQMKAAkBEAUNBwgGEQkCBQYFGg8KDQUIAAEEEgACCAcABAQLAQsVAAEZHRQAEAIIBwIcDwEBDg4YAgQEAgIDAQMMBAkABAUBcAECAgUGAQGAAoACBgkBfwFB8JzAAgsHMQwBZgIAAWcBAAFoACMBaQBaAWoAGAFrAFcBbAA9AW0APAFuADsBbwAcAXAAOgFxADkJBwEAQQELAVUKmNsEV4IEAQN/IAJBgARPBEAgACABIAIQARogAA8LIAAgAmohAwJAIAAgAXNBA3FFBEACQCACQQFIBEAgACECDAELIABBA3FFBEAgACECDAELIAAhAgNAIAIgAS0AADoAACABQQFqIQEgAkEBaiICIANPDQEgAkEDcQ0ACwsCQCADQXxxIgRBwABJDQAgAiAEQUBqIgVLDQADQCACIAEoAgA2AgAgAiABKAIENgIEIAIgASgCCDYCCCACIAEoAgw2AgwgAiABKAIQNgIQIAIgASgCFDYCFCACIAEoAhg2AhggAiABKAIcNgIcIAIgASgCIDYCICACIAEoAiQ2AiQgAiABKAIoNgIoIAIgASgCLDYCLCACIAEoAjA2AjAgAiABKAI0NgI0IAIgASgCODYCOCACIAEoAjw2AjwgAUFAayEBIAJBQGsiAiAFTQ0ACwsgAiAETw0BA0AgAiABKAIANgIAIAFBBGohASACQQRqIgIgBEkNAAsMAQsgA0EESQRAIAAhAgwBCyAAIANBBGsiBEsEQCAAIQIMAQsgACECA0AgAiABLQAAOgAAIAIgAS0AAToAASACIAEtAAI6AAIgAiABLQADOgADIAFBBGohASACQQRqIgIgBE0NAAsLIAIgA0kEQANAIAIgAS0AADoAACABQQFqIQEgAkEBaiICIANHDQALCyAAC5gLAgV/D34jAEHgAGsiBSQAIAJCIIYgAUIgiIQhDyAEQi+GIANCEYiEIQwgBEL///////8/gyINQg+GIANCMYiEIRAgAiAEhUKAgICAgICAgIB/gyEKIAJC////////P4MiC0IgiCERIA1CEYghEiAEQjCIp0H//wFxIQcCQAJ/IAJCMIinQf//AXEiCUEBa0H9/wFNBEBBACAHQQFrQf7/AUkNARoLIAFQIAJC////////////AIMiDkKAgICAgIDA//8AVCAOQoCAgICAgMD//wBRG0UEQCACQoCAgICAgCCEIQoMAgsgA1AgBEL///////////8AgyICQoCAgICAgMD//wBUIAJCgICAgICAwP//AFEbRQRAIARCgICAgICAIIQhCiADIQEMAgsgASAOQoCAgICAgMD//wCFhFAEQCACIAOEUARAQoCAgICAgOD//wAhCkIAIQEMAwsgCkKAgICAgIDA//8AhCEKQgAhAQwCCyADIAJCgICAgICAwP//AIWEUARAIAEgDoQhAkIAIQEgAlAEQEKAgICAgIDg//8AIQoMAwsgCkKAgICAgIDA//8AhCEKDAILIAEgDoRQBEBCACEBDAILIAIgA4RQBEBCACEBDAILIA5C////////P1gEQCAFQdAAaiABIAsgASALIAtQIgYbeSAGQQZ0rXynIgZBD2sQCSAFKQNYIgtCIIYgBSkDUCIBQiCIhCEPIAtCIIghEUEQIAZrIQYLIAYgAkL///////8/Vg0AGiAFQUBrIAMgDSADIA0gDVAiCBt5IAhBBnStfKciCEEPaxAJIAUpA0giAkIPhiAFKQNAIgNCMYiEIRAgAkIvhiADQhGIhCEMIAJCEYghEiAGIAhrQRBqCyEGIAxC/////w+DIgIgAUL/////D4MiAX4iEyADQg+GQoCA/v8PgyIDIA9C/////w+DIg5+fCIEQiCGIg0gASADfnwiDCANVK0gAiAOfiIVIAMgC0L/////D4MiC358IhQgEEL/////D4MiDSABfnwiECAEIBNUrUIghiAEQiCIhHwiEyACIAt+IhYgAyARQoCABIQiD358IgMgDSAOfnwiESABIBJC/////weDQoCAgIAIhCIBfnwiEkIghnwiF3whBCAH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AgAgACACNgIAIAEgBSAAKAIEaiICNgIEIAAgAjYCBCABIAYgACgCCGoiAjYCCCAAIAI2AgggASAEIAAoAgxqIgI2AgwgACACNgIMIAEgDSAAKAIQaiICNgIQIAAgAjYCECABIBEgACgCFGoiAjYCFCAAIAI2AhQgASASIAAoAhhqIgI2AhggACACNgIYIAEgCiAAKAIcaiICNgIcIAAgAjYCHCABIA4gACgCIGoiAjYCICAAIAI2AiAgASAQIAAoAiRqIgI2AiQgACACNgIkIAEgByAAKAIoaiICNgIoIAAgAjYCKCABIAEoAiwgACgCLGoiAjYCLCAAIAI2AiwgASABKAIwIAAoAjBqIgI2AjAgACACNgIwIAEgASgCNCAAKAI0aiICNgI0IAAgAjYCNCABIAEoAjggACgCOGoiAjYCOCAAIAI2AjggASABKAI8IAAoAjxqIgE2AjwgACABNgI8C/kBAgJ/A34jAEEQayICJAACfiABvSIFQv///////////wCDIgRCgICAgICAgAh9Qv/////////v/wBYBEAgBEI8hiEGIARCBIhCgICAgICAgIA8fAwBCyAEQoCAgICAgID4/wBaBEAgBUI8hiEGIAVCBIhCgICAgICAwP//AIQMAQsgBFAEQEIADAELIAIgBEIAIAWnZ0EgaiAEQiCIp2cgBEKAgICAEFQbIgNBMWoQCSACKQMAIQYgAikDCEKAgICAgIDAAIVBjPgAIANrrUIwhoQLIQQgACAGNwMAIAAgBCAFQoCAgICAgICAgH+DhDcDCCACQRBqJAALaQEDfiAAIAJCIIgiAyABQiCIIgR+IAJC/////w+DIgIgAUL/////D4MiAX4iBUIgiCACIAR+fCICQiCIfCABIAN+IAJC/////w+DfCIBQiCIfDcDCCAAIAVC/////w+DIAFCIIaENwMAC1IBAn9BvBYoAgAiASAAQQNqQXxxIgJqIQACQCACQQFOQQAgACABTRsNAD8AQRB0IABJBEAgABAARQ0BC0G8FiAANgIAIAEPC0G8GEEwNgIAQX8L2wECAX8CfkEBIQQCQCAAQgBSIAFC////////////AIMiBUKAgICAgIDA//8AViAFQoCAgICAgMD//wBRGw0AIAJCAFIgA0L///////////8AgyIGQoCAgICAgMD//wBWIAZCgICAgICAwP//AFEbDQAgACAChCAFIAaEhFAEQEEADwsgASADg0IAWQRAQX8hBCAAIAJUIAEgA1MgASADURsNASAAIAKFIAEgA4WEQgBSDwtBfyEEIAAgAlYgASADVSABIANRGw0AIAAgAoUgASADhYRCAFIhBAsgBAtvAQF/IwBBgAJrIgUkAAJAIAIgA0wNACAEQYDABHENACAFIAFB/wFxIAIgA2siAkGAAiACQYACSSIBGxAYGiABRQRAA0AgACAFQYACEBQgAkGAAmsiAkH/AUsNAAsLIAAgBSACEBQLIAVBgAJqJAALrCgCMH87fiMAQUBqIgYkAAJAIARFBEAgASkDeCE5IAApA3ghNSABKQNwITsgACkDcCE2IAEpA2ghPCAAKQNoITcgASkDYCE9IAApA2AhOCABKQNYITogACkDWCFEIAEpA1AhQSAAKQNQIUUgASkDSCE+IAApA0ghRiAAKQM4IUIgACkDMCFHIAApAyghPyAAKQMgIUggACkDGCFDIAApAxAhSSAAKQMIIUAgBiABKQMAIAEpA0AgACkDQIUiSiAAKQMAhYU3AwAgBiABKQMIIEAgPiBGhSI+hYU3AwggBiABKQMQIEkgQSBFhSJBhYU3AxAgBiABKQMYIEMgOiBEhSI6hYU3AxggBiABKQMgIEggOCA9hSI9hYU3AyAgBiABKQMoID8gNyA8hSI8hYU3AyggBiABKQMwIEcgNiA7hSI7hYU3AzAgBiABKQM4IEIgNSA5hSI5hYU3AzggBiACQQQQDCAGIDkgBikDOIU3AzggBiA7IAYpAzCFNwMwIAYgPCAGKQMohTcDKCAGID0gBikDIIU3AyAgBiA6IAYpAxiFNwMYIAYgQSAGKQMQhTcDECAGID4gBikDCIU3AwggBiBKIAYpAwCFNwMAIAYgAkFAa0EEEAwMAQsgBCgCBCEFIAQoAgAhBCABIANBB3RBQGoiB2oiCCkDOCAAIAdqIgcpAziFITkgCCkDMCAHKQMwhSE1IAgpAyggBykDKIUhOyAIKQMgIAcpAyCFITYgCCkDGCAHKQMYhSE8IAgpAxAgBykDEIUhNyAIKQMIIAcpAwiFIT0gCCkDACAHKQMAhSE4IANBAXRBAmshGgNAIAUgBCAEIAQgBCAEIAEgFEEGdCIHaiIDKQMAIAAgB2oiCCkDACA4hYUiOELwn4CAgP4DgyI6p2oiFSkDACA4Qv////8PgyA4QiCIfnwgBSA6QiCIp2oiCSkDAIUiOELwn4CAgP4DgyI6p2oiDCkDACA4Qv////8PgyA4QiCIfnwgBSA6QiCIp2oiDSkDAIUiOELwn4CAgP4DgyI6p2oiDikDACA4Qv////8PgyA4QiCIfnwgBSA6QiCIp2oiDykDAIUiOELwn4CAgP4DgyI6p2oiECkDACA4Qv////8PgyA4QiCIfnwgBSA6QiCIp2oiESkDAIUiOELwn4CAgP4DgyI6p2oiEikDACA4Qv////8PgyA4QiCIfnwgBSA6QiCIp2oiEykDAIUiOELwn4CAgP4DgyI6QiCIp2oiCikDACFEIAQgOqdqIgspAwAhOiAKKQMIIUEgCykDCCFFIAUgBCAEIAQgBCAEIAMpAxAgCCkDECA3hYUiN0Lwn4CAgP4DgyI+p2oiCikDACA3Qv////8PgyA3QiCIfnwgBSA+QiCIp2oiCykDAIUiN0Lwn4CAgP4DgyI+p2oiGykDACA3Qv////8PgyA3QiCIfnwgBSA+QiCIp2oiHCkDAIUiN0Lwn4CAgP4DgyI+p2oiHSkDACA3Qv////8PgyA3QiCIfnwgBSA+QiCIp2oiHikDAIUiN0Lwn4CAgP4DgyI+p2oiHykDACA3Qv////8PgyA3QiCIfnwgBSA+QiCIp2oiICkDAIUiN0Lwn4CAgP4DgyI+p2oiISkDACA3Qv////8PgyA3QiCIfnwgBSA+QiCIp2oiIikDAIUiN0Lwn4CAgP4DgyI+QiCIp2oiFikDACFGIAQgPqdqIhcpAwAhPiAWKQMIIUIgFykDCCFHIAUgBCAEIAQgBCAEIAMpAyAgCCkDICA2hYUiNkLwn4CAgP4DgyI/p2oiFikDACA2Qv////8PgyA2QiCIfnwgBSA/QiCIp2oiFykDAIUiNkLwn4CAgP4DgyI/p2oiIykDACA2Qv////8PgyA2QiCIfnwgBSA/QiCIp2oiJCkDAIUiNkLwn4CAgP4DgyI/p2oiJSkDACA2Qv////8PgyA2QiCIfnwgBSA/QiCIp2oiJikDAIUiNkLwn4CAgP4DgyI/p2oiJykDACA2Qv////8PgyA2QiCIfnwgBSA/QiCIp2oiKCkDAIUiNkLwn4CAgP4DgyI/p2oiKSkDACA2Qv////8PgyA2QiCIfnwgBSA/QiCIp2oiKikDAIUiNkLwn4CAgP4DgyI/QiCIp2oiGCkDACFIIAQgP6dqIhkpAwAhPyAYKQMIIUMgGSkDCCFJIAUgBCAEIAQgBCAEIAMpAzAgCCkDMCA1hYUiNULwn4CAgP4DgyJAp2oiGCkDACA1Qv////8PgyA1QiCIfnwgBSBAQiCIp2oiGSkDAIUiNULwn4CAgP4DgyJAp2oiKykDACA1Qv////8PgyA1QiCIfnwgBSBAQiCIp2oiLCkDAIUiNULwn4CAgP4DgyJAp2oiLSkDACA1Qv////8PgyA1QiCIfnwgBSBAQiCIp2oiLikDAIUiNULwn4CAgP4DgyJAp2oiLykDACA1Qv////8PgyA1QiCIfnwgBSBAQiCIp2oiMCkDAIUiNULwn4CAgP4DgyJAp2oiMSkDACA1Qv////8PgyA1QiCIfnwgBSBAQiCIp2oiMikDAIUiNULwn4CAgP4DgyJAQiCIp2oiMykDACFKIAQgQKdqIjQpAwAhQCATKQMIIUsgEikDCCFMICIpAwghTSAhKQMIIU4gKikDCCFPICkpAwghUCARKQMIIVEgECkDCCFSICApAwghUyAfKQMIIVQgKCkDCCFVICcpAwghViAPKQMIIVcgDikDCCFYIB4pAwghWSAdKQMIIVogJikDCCFbICUpAwghXCANKQMIIV0gDCkDCCFeIBwpAwghXyAbKQMIIWAgJCkDCCFhICMpAwghYiAJKQMIIWMgFSkDCCFkIAspAwghZSAKKQMIIWYgFykDCCFnIBYpAwghaCADKQMIIWkgCCkDCCFqIAMpAxghayAIKQMYIWwgAykDKCFtIAgpAyghbiACIAdqIgcgMykDCCA0KQMIIDIpAwggMSkDCCAwKQMIIC8pAwggLikDCCAtKQMIICwpAwggKykDCCAZKQMIIBgpAwggAykDOCAIKQM4IDmFhSI5QiCIIDlC/////w+DfnyFIjlCIIggOUL/////D4N+fIUiOUIgiCA5Qv////8Pg358hSI5QiCIIDlC/////w+DfnyFIjlCIIggOUL/////D4N+fIUiOUIgiCA5Qv////8Pg358hSJvNwM4IAcgSiBAIDVC/////w+DIDVCIIh+fIUiOTcDMCAHIEMgSSBPIFAgVSBWIFsgXCBhIGIgZyBoIG0gOyBuhYUiNUIgiCA1Qv////8Pg358hSI1QiCIIDVC/////w+DfnyFIjVCIIggNUL/////D4N+fIUiNUIgiCA1Qv////8Pg358hSI1QiCIIDVC/////w+DfnyFIjVCIIggNUL/////D4N+fIUiQzcDKCAHIEggPyA2Qv////8PgyA2QiCIfnyFIjs3AyAgByBCIEcgTSBOIFMgVCBZIFogXyBgIGUgZiBrIDwgbIWFIjVCIIggNUL/////D4N+fIUiNUIgiCA1Qv////8Pg358hSI1QiCIIDVC/////w+DfnyFIjVCIIggNUL/////D4N+fIUiNUIgiCA1Qv////8Pg358hSI1QiCIIDVC/////w+DfnyFIkI3AxggByBGID4gN0L/////D4MgN0IgiH58hSI8NwMQIAcgQSBFIEsgTCBRIFIgVyBYIF0gXiBjIGQgaSA9IGqFhSI1QiCIIDVC/////w+DfnyFIjVCIIggNUL/////D4N+fIUiNUIgiCA1Qv////8Pg358hSI1QiCIIDVC/////w+DfnyFIjVCIIggNUL/////D4N+fIUiNUIgiCA1Qv////8Pg358hSJBNwMIIAcgRCA6IDhC/////w+DIDhCIIh+fIUiPTcDACAEIAQgBCAEIAQgBCABIBRBAXIiFUEGdCIHaiIDKQMwIAAgB2oiCCkDMCA5hYUiOULwn4CAgP4DgyI1p2oiCSkDACA5Qv////8PgyA5QiCIfnwgBSA1QiCIp2oiDCkDAIUiOULwn4CAgP4DgyI1p2oiDSkDACA5Qv////8PgyA5QiCIfnwgBSA1QiCIp2oiDikDAIUiOULwn4CAgP4DgyI1p2oiDykDACA5Qv////8PgyA5QiCIfnwgBSA1QiCIp2oiECkDAIUiOULwn4CAgP4DgyI1p2oiESkDACA5Qv////8PgyA5QiCIfnwgBSA1QiCIp2oiEikDAIUiOULwn4CAgP4DgyI1p2oiEykDACA5Qv////8PgyA5QiCIfnwgBSA1QiCIp2oiCikDAIUiNULwn4CAgP4DgyI5p2oiCykDCCAKKQMIIBMpAwggEikDCCARKQMIIBApAwggDykDCCAOKQMIIA0pAwggDCkDCCAJKQMIIAMpAzggCCkDOCBvhYUiNkIgiCA2Qv////8Pg358hSI2QiCIIDZC/////w+DfnyFIjZCIIggNkL/////D4N+fIUiNkIgiCA2Qv////8Pg358hSI2QiCIIDZC/////w+DfnyFIjZCIIggNkL/////D4N+fCAFIDlCIIinaiIJKQMIhSE5IAkpAwAgCykDACA1Qv////8PgyA1QiCIfnyFITUgBCAEIAQgBCAEIAQgAykDICAIKQMgIDuFhSI7QvCfgICA/gODIjanaiIJKQMAIDtC/////w+DIDtCIIh+fCAFIDZCIIinaiIMKQMAhSI7QvCfgICA/gODIjanaiINKQMAIDtC/////w+DIDtCIIh+fCAFIDZCIIinaiIOKQMAhSI7QvCfgICA/gODIjanaiIPKQMAIDtC/////w+DIDtCIIh+fCAFIDZCIIinaiIQKQMAhSI7QvCfgICA/gODIjanaiIRKQMAIDtC/////w+DIDtCIIh+fCAFIDZCIIinaiISKQMAhSI7QvCfgICA/gODIjanaiITKQMAIDtC/////w+DIDtCIIh+fCAFIDZCIIinaiIKKQMAhSI2QvCfgICA/gODIjunaiILKQMIIAopAwggEykDCCASKQMIIBEpAwggECkDCCAPKQMIIA4pAwggDSkDCCAMKQMIIAkpAwggAykDKCAIKQMoIEOFhSI3QiCIIDdC/////w+DfnyFIjdCIIggN0L/////D4N+fIUiN0IgiCA3Qv////8Pg358hSI3QiCIIDdC/////w+DfnyFIjdCIIggN0L/////D4N+fIUiN0IgiCA3Qv////8Pg358IAUgO0IgiKdqIgkpAwiFITsgCSkDACALKQMAIDZC/////w+DIDZCIIh+fIUhNiAEIAQgBCAEIAQgBCADKQMQIAgpAxAgPIWFIjxC8J+AgID+A4MiN6dqIgkpAwAgPEL/////D4MgPEIgiH58IAUgN0IgiKdqIgwpAwCFIjxC8J+AgID+A4MiN6dqIg0pAwAgPEL/////D4MgPEIgiH58IAUgN0IgiKdqIg4pAwCFIjxC8J+AgID+A4MiN6dqIg8pAwAgPEL/////D4MgPEIgiH58IAUgN0IgiKdqIhApAwCFIjxC8J+AgID+A4MiN6dqIhEpAwAgPEL/////D4MgPEIgiH58IAUgN0IgiKdqIhIpAwCFIjxC8J+AgID+A4MiN6dqIhMpAwAgPEL/////D4MgPEIgiH58IAUgN0IgiKdqIgopAwCFIjdC8J+AgID+A4MiPKdqIgspAwggCikDCCATKQMIIBIpAwggESkDCCAQKQMIIA8pAwggDikDCCANKQMIIAwpAwggCSkDCCADKQMYIAgpAxggQoWFIjhCIIggOEL/////D4N+fIUiOEIgiCA4Qv////8Pg358hSI4QiCIIDhC/////w+DfnyFIjhCIIggOEL/////D4N+fIUiOEIgiCA4Qv////8Pg358hSI4QiCIIDhC/////w+DfnwgBSA8QiCIp2oiCSkDCIUhPCAJKQMAIAspAwAgN0L/////D4MgN0IgiH58hSE3IAQgBCAEIAQgBCAEIAMpAwAgCCkDACA9hYUiPULwn4CAgP4DgyI4p2oiCSkDACA9Qv////8PgyA9QiCIfnwgBSA4QiCIp2oiDCkDAIUiPULwn4CAgP4DgyI4p2oiDSkDACA9Qv////8PgyA9QiCIfnwgBSA4QiCIp2oiDikDAIUiPULwn4CAgP4DgyI4p2oiDykDACA9Qv////8PgyA9QiCIfnwgBSA4QiCIp2oiECkDAIUiPULwn4CAgP4DgyI4p2oiESkDACA9Qv////8PgyA9QiCIfnwgBSA4QiCIp2oiEikDAIUiPULwn4CAgP4DgyI4p2oiEykDACA9Qv////8PgyA9QiCIfnwgBSA4QiCIp2oiCikDAIUiOELwn4CAgP4DgyI9p2oiCykDCCAKKQMIIBMpAwggEikDCCARKQMIIBApAwggDykDCCAOKQMIIA0pAwggDCkDCCAJKQMIIAMpAwggCCkDCCBBhYUiOkIgiCA6Qv////8Pg358hSI6QiCIIDpC/////w+DfnyFIjpCIIggOkL/////D4N+fIUiOkIgiCA6Qv////8Pg358hSI6QiCIIDpC/////w+DfnyFIjpCIIggOkL/////D4N+fCAFID1CIIinaiIDKQMIhSE9IAMpAwAgCykDACA4Qv////8PgyA4QiCIfnyFITggFCAaT0UEQCACIAdqIgMgOTcDOCADIDU3AzAgAyA7NwMoIAMgNjcDICADIDw3AxggAyA3NwMQIAMgPTcDCCADIDg3AwAgFEECaiEUDAELCyAGIDk3AzggBiA1NwMwIAYgOzcDKCAGIDY3AyAgBiA8NwMYIAYgNzcDECAGID03AwggBiA4NwMAIAYgAiAVQQZ0akEEEAwLIAYpAwAhOSAGQUBrJAAgOacLYwIBfwF+IwBBEGsiAiQAIAACfiABRQRAQgAMAQsgAiABrUIAIAFnIgFB0QBqEAkgAikDCEKAgICAgIDAAIVBnoABIAFrrUIwhnwhAyACKQMACzcDACAAIAM3AwggAkEQaiQACxYAIAAtAABBIHFFBEAgASACIAAQPgsLiAEBA38jAEEQayIDJAAgA0EAOgAPIAEtAAAhBAJAIAJFDQAgBEUNAANAIAEtAAEiBUUNASADIAU6AA4gAyAEOgANIAAgA0ENaiADQQhqEEk8AAAgAygCCC0AAA0BIAEtAAIhBCACQQFrIgJFDQEgAUECaiEBIABBAWohACAEDQALCyADQRBqJAAL5QQCAn8BfiABIAEpAyAiBadBA3ZBP3EiA2pBKGohBAJAIANBN00EQCAEQeAIQTggA2sQBRoMAQsgBEHgCEHAACADaxAFGiABIAFBKGogAiACQYACahAIIAFCADcDWCABQgA3A1AgAUIANwNIIAFBQGtCADcDACABQgA3AzggAUIANwMwIAFCADcDKCABKQMgIQULIAEgBUIohkKAgICAgIDA/wCDIAVCOIaEIAVCGIZCgICAgIDgP4MgBUIIhkKAgICA8B+DhIQgBUIIiEKAgID4D4MgBUIYiEKAgPwHg4QgBUIoiEKA/gODIAVCOIiEhIQ3AGAgASABQShqIAIgAkGAAmoQCCAAIAEoAgAiAkEYdCACQQh0QYCA/AdxciACQQh2QYD+A3EgAkEYdnJyNgAAIAAgASgCBCICQRh0IAJBCHRBgID8B3FyIAJBCHZBgP4DcSACQRh2cnI2AAQgACABKAIIIgJBGHQgAkEIdEGAgPwHcXIgAkEIdkGA/gNxIAJBGHZycjYACCAAIAEoAgwiAkEYdCACQQh0QYCA/AdxciACQQh2QYD+A3EgAkEYdnJyNgAMIAAgASgCECICQRh0IAJBCHRBgID8B3FyIAJBCHZBgP4DcSACQRh2cnI2ABAgACABKAIUIgJBGHQgAkEIdEGAgPwHcXIgAkEIdkGA/gNxIAJBGHZycjYAFCAAIAEoAhgiAkEYdCACQQh0QYCA/AdxciACQQh2QYD+A3EgAkEYdnJyNgAYIAAgASgCHCIAQRh0IABBCHRBgID8B3FyIABBCHZBgP4DcSAAQRh2cnI2ABwLkAEBA38gACEBAkACQCAAQQNxRQ0AIAAtAABFBEBBAA8LA0AgAUEBaiIBQQNxRQ0BIAEtAAANAAsMAQsDQCABIgJBBGohASACKAIAIgNBf3MgA0GBgoQIa3FBgIGChHhxRQ0ACyADQf8BcUUEQCACIABrDwsDQCACLQABIQMgAkEBaiIBIQIgAw0ACwsgASAAawvzAgICfwF+AkAgAkUNACAAIAJqIgNBAWsgAToAACAAIAE6AAAgAkEDSQ0AIANBAmsgAToAACAAIAE6AAEgA0EDayABOgAAIAAgAToAAiACQQdJDQAgA0EEayABOgAAIAAgAToAAyACQQlJDQAgAEEAIABrQQNxIgRqIgMgAUH/AXFBgYKECGwiATYCACADIAIgBGtBfHEiBGoiAkEEayABNgIAIARBCUkNACADIAE2AgggAyABNgIEIAJBCGsgATYCACACQQxrIAE2AgAgBEEZSQ0AIAMgATYCGCADIAE2AhQgAyABNgIQIAMgATYCDCACQRBrIAE2AgAgAkEUayABNgIAIAJBGGsgATYCACACQRxrIAE2AgAgBCADQQRxQRhyIgRrIgJBIEkNACABrSIFQiCGIAWEIQUgAyAEaiEBA0AgASAFNwMYIAEgBTcDECABIAU3AwggASAFNwMAIAFBIGohASACQSBrIgJBH0sNAAsLIAALUAEBfgJAIANBwABxBEAgAiADQUBqrYghAUIAIQIMAQsgA0UNACACQcAAIANrrYYgASADrSIEiIQhASACIASIIQILIAAgATcDACAAIAI3AwgLQQECfyMAQRBrIgQkACACBEADQCAEIAEgA2otAAA2AgAgACADQQF0aiAEEFMgA0EBaiIDIAJHDQALCyAEQRBqJAALpSACC38WfiMAQUBqIgUkAAJAIARFBEAgASkDeCEQIAApA3ghESABKQNwIRMgACkDcCEXIAEpA2ghFCAAKQNoIRIgASkDYCEVIAApA2AhFiABKQNYIRggACkDWCEbIAEpA1AhGSAAKQNQIRwgASkDSCEaIAApA0ghHSAAKQM4IR4gACkDMCEfIAApAyghICAAKQMgISEgACkDGCEiIAApAxAhIyAAKQMIISQgBSABKQMAIAEpA0AgACkDQIUiJSAAKQMAhYU3AwAgBSABKQMIICQgGiAdhSIahYU3AwggBSABKQMQICMgGSAchSIZhYU3AxAgBSABKQMYICIgGCAbhSIYhYU3AxggBSABKQMgICEgFSAWhSIVhYU3AyAgBSABKQMoICAgEiAUhSIUhYU3AyggBSABKQMwIB8gEyAXhSIThYU3AzAgBSABKQM4IB4gECARhSIQhYU3AzggBSACQQEQDCAFIBAgBSkDOIU3AzggBSATIAUpAzCFNwMwIAUgFCAFKQMohTcDKCAFIBUgBSkDIIU3AyAgBSAYIAUpAxiFNwMYIAUgGSAFKQMQhTcDECAFIBogBSkDCIU3AwggBSAlIAUpAwCFNwMAIAUgAkFAa0EBEAwMAQsgBCgCDCEIIAQoAgghCyAEKAIEIQcgBCgCACEJIAEgA0EHdEFAaiIGaiIKKQM4IAAgBmoiBikDOIUhECAKKQMwIAYpAzCFIREgCikDKCAGKQMohSETIAopAyAgBikDIIUhFyAKKQMYIAYpAxiFIRQgCikDECAGKQMQhSEVIAopAwggBikDCIUhFiAKKQMAIAYpAwCFIRIgA0EBdEECayEPQQAhAwNAIAAgA0EGdCINaiIKKQM4IRggCikDMCEbIAopAyghGSAKKQMgIRwgCikDGCEaIAopAxAhHSAKKQMIIR4gBSABIA1qIgYpAwAgCikDACAShYUiEjcDACAFIAYpAwggFiAehYUiFjcDCCAFIAYpAxAgFSAdhYU3AxAgBSAGKQMYIBQgGoWFNwMYIAUgBikDICAXIByFhTcDICAFIAYpAyggEyAZhYU3AyggBSAGKQMwIBEgG4WFNwMwIAUgBikDOCAQIBiFhTcDOCAFIAkgEkLw/4GAgP4fgyIQp2oiBikDACASQv////8PgyASQiCIfnwgByIKIBBCIIinaiIHKQMAhSIQNwMAIAUgBykDCCAGKQMIIBZC/////w+DIBZCIIh+fIU3AwggCCAJaiIHIBA3AwAgByAFKQMINwMIIAUgBSkDECIQQiCIIBBC/////w+DfiAJIBBC8P+BgID+H4MiEKdqIgcpAwB8IAogEEIgiKdqIgYpAwCFIhA3AxAgBSAGKQMIIAcpAwggBSkDGCIRQiCIIBFC/////w+DfnyFNwMYIAggCmoiByAQNwMAIAcgBSkDGDcDCCAFIAUpAyAiEEIgiCAQQv////8Pg34gCSAQQvD/gYCA/h+DIhCnaiIHKQMAfCAKIBBCIIinaiIGKQMAhSIQNwMgIAUgBikDCCAHKQMIIAUpAygiEUIgiCARQv////8Pg358hTcDKCAJIAhBEGoiB2oiBiAQNwMAIAYgBSkDKDcDCCAFIAUpAzAiEEIgiCAQQv////8Pg34gCSAQQvD/gYCA/h+DIhCnaiIGKQMAfCAKIBBCIIinaiIMKQMAhSIQNwMwIAUgDCkDCCAGKQMIIAUpAzgiEUIgiCARQv////8Pg358hTcDOCAHIApqIgcgEDcDACAHIAUpAzg3AwggBSAFKQMAIhBCIIggEEL/////D4N+IAkgEELw/4GAgP4fgyIQp2oiBykDAHwgCiAQQiCIp2oiBikDAIUiEDcDACAFIAYpAwggBykDCCAFKQMIIhFCIIggEUL/////D4N+fIU3AwggCSAIQSBqIgdqIgYgEDcDACAGIAUpAwg3AwggBSAFKQMQIhBCIIggEEL/////D4N+IAkgEELw/4GAgP4fgyIQp2oiBikDAHwgCiAQQiCIp2oiDCkDAIUiEDcDECAFIAwpAwggBikDCCAFKQMYIhFCIIggEUL/////D4N+fIU3AxggByAKaiIHIBA3AwAgByAFKQMYNwMIIAUgBSkDICIQQiCIIBBC/////w+DfiAJIBBC8P+BgID+H4MiEKdqIgcpAwB8IAogEEIgiKdqIgYpAwCFNwMgIAUgBikDCCAHKQMIIAUpAygiEEIgiCAQQv////8Pg358hTcDKCAFIAUpAzAiEEIgiCAQQv////8Pg34gCSAQQvD/gYCA/h+DIhCnaiIHKQMAfCAKIBBCIIinaiIGKQMAhTcDMCAFIAYpAwggBykDCCAFKQM4IhBCIIggEEL/////D4N+fIU3AzggBSAFKQMAIhBCIIggEEL/////D4N+IAkgEELw/4GAgP4fgyIQp2oiBykDAHwgCiAQQiCIp2oiBikDAIUiEDcDACAFIAYpAwggBykDCCAFKQMIIhFCIIggEUL/////D4N+fIU3AwggCSAIQTBqIgdqIgYgEDcDACAGIAUpAwg3AwggBSAFKQMQIhBCIIggEEL/////D4N+IAkgEELw/4GAgP4fgyIQp2oiBikDAHwgCiAQQiCIp2oiDCkDAIUiEDcDECAFIAwpAwggBikDCCAFKQMYIhFCIIggEUL/////D4N+fIU3AxggByAKaiIHIBA3AwAgByAFKQMYNwMIIAUgBSkDICIQQiCIIBBC/////w+DfiAJIBBC8P+BgID+H4MiEKdqIgcpAwB8IAogEEIgiKdqIgYpAwCFIhE3AyAgBSAGKQMIIAcpAwggBSkDKCIQQiCIIBBC/////w+DfnyFIhM3AyggBSAFKQMwIhBCIIggEEL/////D4N+IAkgEELw/4GAgP4fgyIQp2oiBykDAHwgCiAQQiCIp2oiBikDAIUiFzcDMCAGKQMIIRIgBykDCCEVIAUpAzghECACIA1qIgcgBSkDACIWNwMAIAcgBSkDCCIYNwMIIAcgBSkDECIbNwMQIAUpAxghFCAHIBIgFSAQQv////8PgyAQQiCIfnyFIhU3AzggByAXNwMwIAcgEzcDKCAHIBE3AyAgByAUNwMYIAAgA0EBciIMQQZ0Ig1qIgcpAzghGSAHKQMwIRwgBykDKCEaIAcpAyAhHSAHKQMYIR4gBykDECEfIAcpAwghEiAFIAEgDWoiBikDACAWIAcpAwCFhSIQNwMAIAUgBikDCCASIBiFhSISNwMIIAUgBikDECAbIB+FhTcDECAFIAYpAxggFCAehYU3AxggBSAGKQMgIBEgHYWFNwMgIAUgBikDKCATIBqFhTcDKCAFIAYpAzAgFyAchYU3AzAgBSAGKQM4IBUgGYWFNwM4IAUgCyIHIBBC8P+BgID+H4MiEadqIgspAwAgEEL/////D4MgEEIgiH58IAkgEUIgiKdqIgYpAwCFIhA3AwAgBSAGKQMIIAspAwggEkL/////D4MgEkIgiH58hTcDCCAHIAhBQGtB8P8BcSILaiIIIBA3AwAgCCAFKQMINwMIIAUgBSkDECIQQiCIIBBC/////w+DfiAHIBBC8P+BgID+H4MiEKdqIggpAwB8IAkgEEIgiKdqIgYpAwCFIhA3AxAgBSAGKQMIIAgpAwggBSkDGCIRQiCIIBFC/////w+DfnyFNwMYIAkgC2oiCCAQNwMAIAggBSkDGDcDCCAFIAUpAyAiEEIgiCAQQv////8Pg34gByAQQvD/gYCA/h+DIhCnaiIIKQMAfCAJIBBCIIinaiIGKQMAhSIQNwMgIAUgBikDCCAIKQMIIAUpAygiEUIgiCARQv////8Pg358hTcDKCAHIAtBEGoiCGoiBiAQNwMAIAYgBSkDKDcDCCAFIAUpAzAiEEIgiCAQQv////8Pg34gByAQQvD/gYCA/h+DIhCnaiIGKQMAfCAJIBBCIIinaiIOKQMAhSIQNwMwIAUgDikDCCAGKQMIIAUpAzgiEUIgiCARQv////8Pg358hTcDOCAIIAlqIgggEDcDACAIIAUpAzg3AwggBSAFKQMAIhBCIIggEEL/////D4N+IAcgEELw/4GAgP4fgyIQp2oiCCkDAHwgCSAQQiCIp2oiBikDAIUiEDcDACAFIAYpAwggCCkDCCAFKQMIIhFCIIggEUL/////D4N+fIU3AwggByALQSBqIghqIgYgEDcDACAGIAUpAwg3AwggBSAFKQMQIhBCIIggEEL/////D4N+IAcgEELw/4GAgP4fgyIQp2oiBikDAHwgCSAQQiCIp2oiDikDAIUiEDcDECAFIA4pAwggBikDCCAFKQMYIhFCIIggEUL/////D4N+fIU3AxggCCAJaiIIIBA3AwAgCCAFKQMYNwMIIAUgBSkDICIQQiCIIBBC/////w+DfiAHIBBC8P+BgID+H4MiEKdqIggpAwB8IAkgEEIgiKdqIgYpAwCFNwMgIAUgBikDCCAIKQMIIAUpAygiEEIgiCAQQv////8Pg358hTcDKCAFIAUpAzAiEEIgiCAQQv////8Pg34gByAQQvD/gYCA/h+DIhCnaiIIKQMAfCAJIBBCIIinaiIGKQMAhTcDMCAFIAYpAwggCCkDCCAFKQM4IhBCIIggEEL/////D4N+fIU3AzggBSAFKQMAIhBCIIggEEL/////D4N+IAcgEELw/4GAgP4fgyIQp2oiCCkDAHwgCSAQQiCIp2oiBikDAIUiEDcDACAFIAYpAwggCCkDCCAFKQMIIhFCIIggEUL/////D4N+fIU3AwggByALQTBqIghqIgYgEDcDACAGIAUpAwg3AwggBSAFKQMQIhBCIIggEEL/////D4N+IAcgEELw/4GAgP4fgyIQp2oiBikDAHwgCSAQQiCIp2oiDikDAIUiEDcDECAFIA4pAwggBikDCCAFKQMYIhFCIIggEUL/////D4N+fIU3AxggCCAJaiIIIBA3AwAgCCAFKQMYNwMIIAUgBSkDICIQQiCIIBBC/////w+DfiAHIBBC8P+BgID+H4MiEKdqIggpAwB8IAkgEEIgiKdqIgYpAwCFIhc3AyAgBSAGKQMIIAgpAwggBSkDKCIQQiCIIBBC/////w+DfnyFIhM3AyggBSAFKQMwIhBCIIggEEL/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IDtC/////w+DfnyFIjtCIIggO0L/////D4N+fIUiO0IgiCA7Qv////8Pg358hSI7QiCIIDtC/////w+DfnyFIjtCIIggO0L/////D4N+fIUiOzcDOCAGIEwgPiA2Qv////8PgyA2QiCIfnyFIjY3AzAgBiBKIEsgUSBSIFcgWCBdIF4gYyBkIGkgaiA6IEGFIjpCIIggOkL/////D4N+fIUiOkIgiCA6Qv////8Pg358hSI6QiCIIDpC/////w+DfnyFIjpCIIggOkL/////D4N+fIUiOkIgiCA6Qv////8Pg358hSI6QiCIIDpC/////w+DfnyFIjo3AyggBiBJID0gNUL/////D4MgNUIgiH58hSI1NwMgIAYgRyBIIE8gUCBVIFYgWyBcIGEgYiBnIGggOSBAhSI5QiCIIDlC/////w+DfnyFIjlCIIggOUL/////D4N+fIUiOUIgiCA5Qv////8Pg358hSI5QiCIIDlC/////w+DfnyFIjlCIIggOUL/////D4N+fIUiOUIgiCA5Qv////8Pg358hSI5NwMYIAYgRiA8IDRC/////w+DIDRCIIh+fIUiNDcDECAGIEQgRSBNIE4gUyBUIFkgWiBfIGAgZSBmIDggP4UiOEIgiCA4Qv////8Pg358hSI4QiCIIDhC/////w+DfnyFIjhCIIggOEL/////D4N+fIUiOEIgiCA4Qv////8Pg358hSI4QiCIIDhC/////w+DfnyFIjhCIIggOEL/////D4N+fIUiODcDCCAGIEIgNyAzQv////8PgyAzQiCIfnyFIjc3AwAgACAIQcAAciIFaiIGKQMAITMgBikDCCE/IAYpAxAhPCAGKQMYIUAgBikDICE9IAYpAyghQSAGKQMwIT4gASAFaiIFIAYpAzggBSkDOIUiQzcDOCAFID4gBSkDMIUiPjcDMCAFIEEgBSkDKIUiQTcDKCAFID0gBSkDIIUiPTcDICAFIEAgBSkDGIUiQDcDGCAFIDwgBSkDEIUiPDcDECAFID8gBSkDCIUiPzcDCCAFIDMgBSkDAIUiQjcDACAEIAMgAyADIAMgNiA+hSIzQvCfgICA/gODIjanaiIFKQMAIDNC/////w+DIDNCIIh+fCAEIDZCIIinaiIIKQMAhSIzQvCfgICA/gODIjanaiIVKQMAIDNC/////w+DIDNCIIh+fCAEIDZCIIinaiIWKQMAhSIzQvCfgICA/gODIjanaiIXKQMAIDNC/////w+DIDNCIIh+fCAEIDZCIIinaiIYKQMAhSIzQvCfgICA/gODIjanaiIZKQMAIDNC/////w+DIDNCIIh+fCAEIDZCIIinaiIaKQMAhSI2QvCfgICA/gODIjNCIIinaiIJKQMIIT4gAyAzp2oiCikDCCFEIAkpAwAhRSAKKQMAIUYgBCADIAMgAyADIDUgPYUiM0Lwn4CAgP4DgyI1p2oiCSkDACAzQv////8PgyAzQiCIfnwgBCA1QiCIp2oiCikDAIUiM0Lwn4CAgP4DgyI1p2oiGykDACAzQv////8PgyAzQiCIfnwgBCA1QiCIp2oiCykDAIUiM0Lwn4CAgP4DgyI1p2oiDCkDACAzQv////8PgyAzQiCIfnwgBCA1QiCIp2oiHCkDAIUiM0Lwn4CAgP4DgyI1p2oiHSkDACAzQv////8PgyAzQiCIfnwgBCA1QiCIp2oiHikDAIUiNULwn4CAgP4DgyIzQiCIp2oiDSkDCCE9IAMgM6dqIg4pAwghRyANKQMAIUggDikDACFJIAQgAyADIAMgAyA0IDyFIjNC8J+AgID+A4MiNKdqIg0pAwAgM0L/////D4MgM0IgiH58IAQgNEIgiKdqIg4pAwCFIjNC8J+AgID+A4MiNKdqIh8pAwAgM0L/////D4MgM0IgiH58IAQgNEIgiKdqIiApAwCFIjNC8J+AgID+A4MiNKdqIiEpAwAgM0L/////D4MgM0IgiH58IAQgNEIgiKdqIg8pAwCFIjNC8J+AgID+A4MiNKdqIhApAwAgM0L/////D4MgM0IgiH58IAQgNEIgiKdqIiIpAwCFIjRC8J+AgID+A4MiM0IgiKdqIhEpAwghPCADIDOnaiISKQMIIUogESkDACFLIBIpAwAhTCAEIAMgAyADIAMgNyBChSIzQvCfgICA/gODIjenaiIRKQMAIDNC/////w+DIDNCIIh+fCAEIDdCIIinaiISKQMAhSIzQvCfgICA/gODIjenaiIjKQMAIDNC/////w+DIDNCIIh+fCAEIDdCIIinaiIkKQMAhSIzQvCfgICA/gODIjenaiIlKQMAIDNC/////w+DIDNCIIh+fCAEIDdCIIinaiImKQMAhSIzQvCfgICA/gODIjenaiInKQMAIDNC/////w+DIDNCIIh+fCAEIDdCIIinaiITKQMAhSIzQvCfgICA/gODIjdCIIinaiIUKQMIIUIgAyA3p2oiKCkDCCE3IBopAwghTSAZKQMIIU4gHikDCCFPIB0pAwghUCAiKQMIIVEgECkDCCFSIBMpAwghUyAnKQMIIVQgGCkDCCFVIBcpAwghViAcKQMIIVcgDCkDCCFYIA8pAwghWSAhKQMIIVogJikDCCFbICUpAwghXCAWKQMIIV0gFSkDCCFeIAspAwghXyAbKQMIIWAgICkDCCFhIB8pAwghYiAkKQMIIWMgIykDCCFkIAgpAwghZSAFKQMIIWYgCikDCCFnIAkpAwghaCAOKQMIIWkgDSkDCCFqIBIpAwghayARKQMIIWwgByADIBQpAwAgKCkDACAzQv////8PgyAzQiCIfnyFIjNC8J+AgID+A4MibadqIgUpAwAgM0L/////D4MgM0IgiH58IAQgbUIgiKdqIggpAwCFIjM3AwAgByAIKQMIIAUpAwggQiA3IFMgVCBbIFwgYyBkIGsgbCA4ID+FIjhCIIggOEL/////D4N+fIUiOEIgiCA4Qv////8Pg358hSI4QiCIIDhC/////w+DfnyFIjhCIIggOEL/////D4N+fIUiOEIgiCA4Qv////8Pg358hSI4QiCIIDhC/////w+DfnyFIjg3AwggByADIEsgTCA0Qv////8PgyA0QiCIfnyFIjRC8J+AgID+A4MiN6dqIgUpAwAgNEL/////D4MgNEIgiH58IAQgN0IgiKdqIggpAwCFIjQ3AxAgByAIKQMIIAUpAwggPCBKIFEgUiBZIFogYSBiIGkgaiA5IECFIjlCIIggOUL/////D4N+fIUiOUIgiCA5Qv////8Pg358hSI5QiCIIDlC/////w+DfnyFIjlCIIggOUL/////D4N+fIUiOUIgiCA5Qv////8Pg358hSI5QiCIIDlC/////w+DfnyFIjk3AxggByADIEggSSA1Qv////8PgyA1QiCIfnyFIjVC8J+AgID+A4MiN6dqIgUpAwAgNUL/////D4MgNUIgiH58IAQgN0IgiKdqIggpAwCFIjU3AyAgByAIKQMIIAUpAwggPSBHIE8gUCBXIFggXyBgIGcgaCA6IEGFIjpCIIggOkL/////D4N+fIUiOkIgiCA6Qv////8Pg358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Rht0IQMgAigCACECA0AgAiIEKAIEQXhxIAFGDQIgA0EddiECIANBAXQhAyAEIAJBBHFqIgdBEGooAgAiAg0ACyAHIAA2AhAgACAENgIYCyAAIAA2AgwgACAANgIIDwsgBCgCCCIBIAA2AgwgBCAANgIIIABBADYCGCAAIAQ2AgwgACABNgIICwuQBgIEfwN+IwBBgAFrIgUkAAJAAkACQCADIARCAEIAEBBFDQAgAyAEEEAhByACQjCIpyIIQf//AXEiBkH//wFGDQAgBw0BCyAFQRBqIAEgAiADIAQQBiAFIAUpAxAiASAFKQMYIgIgASACECggBSkDCCECIAUpAwAhBAwBCyABIAJC////////P4MgBq1CMIaEIgogAyAEQv///////z+DIARCMIinQf//AXEiB61CMIaEIgkQEEEATARAIAEgCiADIAkQEARAIAEhBAwCCyAFQfAAaiABIAJCAEIAEAYgBSkDeCECIAUpA3AhBAwBCyAGBH4gAQUgBUHgAGogASAKQgBCgICAgICAwLvAABAGIAUpA2giCkIwiKdB+ABrIQYgBSkDYAshBCAHRQRAIAVB0ABqIAMgCUIAQoCAgICAgMC7wAAQBiAFKQNYIglCMIinQfgAayEHIAUpA1AhAwsgCUL///////8/g0KAgICAgIDAAIQhCSAKQv///////z+DQoCAgICAgMAAhCEKIAYgB0oEQANAAn4gCiAJfSADIARWrX0iC0IAWQRAIAsgBCADfSIEhFAEQCAFQSBqIAEgAkIAQgAQBiAFKQMoIQIgBSkDICEEDAULIAtCAYYgBEI/iIQMAQsgCkIBhiAEQj+IhAshCiAEQgGGIQQgBkEBayIGIAdKDQALIAchBgsCQCAKIAl9IAMgBFatfSIJQgBTBEAgCiEJDAELIAkgBCADfSIEhEIAUg0AIAVBMGogASACQgBCABAGIAUpAzghAiAFKQMwIQQMAQsgCUL///////8/WARAA0AgBEI/iCEBIAZBAWshBiAEQgGGIQQgASAJQgGGhCIJQoCAgICAgMAAVA0ACwsgCEGAgAJxIQcgBkEATARAIAVBQGsgBCAJQv///////z+DIAZB+ABqIAdyrUIwhoRCAEKAgICAgIDAwz8QBiAFKQNIIQIgBSkDQCEEDAELIAlC////////P4MgBiAHcq1CMIaEIQIL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QiCIIBtC/////w+DfnyFIhtCIIggG0L/////D4N+fIUiG0IgiCAbQv////8Pg358hSIbQiCIIBtC/////w+DfnyFIhtCIIggG0L/////D4N+fCAFIBRCIIinaiIGKQMIhSEbIAYpAwAgECkDACAXQv////8PgyAXQiCIfnyFIRcgAyADIAMgAyADIAMgAikDACAYhSIYQvCfgICA/gODIhSnaiIGKQMAIBhC/////w+DIBhCIIh+fCAFIBRCIIinaiIHKQMAhSIYQvCfgICA/gODIhSnaiIIKQMAIBhC/////w+DIBhCIIh+fCAFIBRCIIinaiIJKQMAhSIYQvCfgICA/gODIhSnaiIKKQMAIBhC/////w+DIBhCIIh+fCAFIBRCIIinaiILKQMAhSIYQvCfgICA/gODIhSnaiIMKQMAIBhC/////w+DIBhCIIh+fCAFIBRCIIinaiINKQMAhSIYQvCfgICA/gODIhSnaiIOKQMAIBhC/////w+DIBhCIIh+fCAFIBRCIIinaiIPKQMAhSIYQvCfgICA/gODIhSnaiIQKQMIIA8pAwggDikDCCANKQMIIAwpAwggCykDCCAKKQMIIAkpAwggCCkDCCAHKQMIIAYpAwggAikDCCAchSIcQiCIIBxC/////w+DfnyFIhxCIIggHEL/////D4N+fIUiHEIgiCAcQv////8Pg358hSIcQiCIIBxC/////w+DfnyFIhxCIIggHEL/////D4N+fIUiHEIgiCAcQv////8Pg358IAUgFEIgiKdqIgIpAwiFIRwgAikDACAQKQMAIBhC/////w+DIBhCIIh+fIUhGCARIBJGRQRAIAEgE2oiAiAZNwM4IAIgFTcDMCACIBo3AyggAiAWNwMgIAIgGzcDGCACIBc3AxAgAiAcNwMIIAIgGDcDACARQQFqIREMAQsLIAQgGTcDOCAEIBU3AzAgBCAaNwMoIAQgFjcDICAEIBs3AxggBCAXNwMQIAQgHDcDCCAEIBg3AwAgBCABIBJBBnRqQQQQDAsgBEFAayQAC/wQAgV/C34jAEHAAWsiBSQAIARC////////P4MhEiACQv///////z+DIQwgAiAEhUKAgICAgICAgIB/gyERIARCMIinQf//AXEhBwJAAkACQCACQjCIp0H//wFxIglBAWtB/f8BTQRAIAdBAWtB/v8BSQ0BCyABUCACQv///////////wCDIgpCgICAgICAwP//AFQgCkKAgICAgIDA//8AURtFBEAgAkKAgICAgIAghCERDAILIANQIARC////////////AIMiAkKAgICAgIDA//8AVCACQoCAgICAgMD//wBRG0UEQCAEQoCAgICAgCCEIREgAyEBDAILIAEgCkKAgICAgIDA//8AhYRQBEAgAyACQoCAgICAgMD//wCFhFAEQEIAIQFCgICAgICA4P//ACERDAMLIBFCgICAgICAwP//AIQhEUIAIQEMAgsgAyACQoCAgICAgMD//wCFhFAEQEIAIQEMAgsgASAKhFANAiACIAOEUARAIBFCgICAgICAwP//AIQhEUIAIQEMAgsgCkL///////8/WARAIAVBsAFqIAEgDCABIAwgDFAiBht5IAZBBnStfKciBkEPaxAJQRAgBmshBiAFKQO4ASEMIAUpA7ABIQELIAJC////////P1YNACAFQaABaiADIBIgAyASIBJQIggbeSAIQQZ0rXynIghBD2sQCSAGIAhqQRBrIQYgBSkDqAEhEiAFKQOgASEDCyAFQZABaiASQoCAgICAgMAAhCIUQg+GIANCMYiEIgJChMn5zr/mvIL1ACACfSIEEA4gBUGAAWpCACAFKQOYAX0gBBAOIAVB8ABqIAUpA4gBQgGGIAUpA4ABQj+IhCIEIAIQDiAFQeAAaiAEQgAgBSkDeH0QDiAFQdAAaiAFKQNoQgGGIAUpA2BCP4iEIgQgAhAOIAVBQGsgBEIAIAUpA1h9EA4gBUEwaiAFKQNIQgGGIAUpA0BCP4iEIgQgAhAOIAVBIGogBEIAIAUpAzh9EA4gBUEQaiAFKQMoQgGGIAUpAyBCP4iEIgQgAhAOIAUgBEIAIAUpAxh9EA4gBiAJIAdraiEGAn5CACAFKQMIQgGGIAUpAwBCP4iEQgF9IgpC/////w+DIgQgAkIgiCILfiIOIApCIIgiCiACQv////8PgyIQfnwiAkIgiCACIA5UrUIghoQgCiALfnwgAkIghiILIAQgEH58IgIgC1StfCACIAIgBCADQhGIQv////8PgyIOfiIQIAogA0IPhkKAgP7/D4MiDX58IgtCIIYiDyAEIA1+fCAPVK0gCiAOfiALIBBUrUIghiALQiCIhHx8fCICVq18IAJCAFKtfH0iC0L/////D4MiDiAEfiIQIAogDn4iDSAEIAtCIIgiD358IgtCIIZ8Ig4gEFStIAogD34gCyANVK1CIIYgC0IgiIR8fCAOQgAgAn0iAkIgiCILIAR+IhAgAkL/////D4MiDSAKfnwiAkIghiIPIAQgDX58IA9UrSAKIAt+IAIgEFStQiCGIAJCIIiEfHx8IgIgDlStfCACQgJ9IhAgAlStfEIBfSILQv////8PgyICIAxCAoYgAUI+iIRC/////w+DIgR+Ig4gAUIeiEL/////D4MiCiALQiCIIgt+fCINIA5UrSANIA0gEEIgiCIOIAxCHohC///v/w+DQoCAEIQiDH58Ig1WrXwgCyAMfnwgAiAMfiITIAQgC358Ig8gE1StQiCGIA9CIIiEfCANIA0gD0IghnwiDVatfCANIA0gCiAOfiITIBBC/////w+DIhAgBH58Ig8gE1StIA8gDyACIAFCAoZC/P///w+DIhN+fCIPVq18fCINVq18IA0gCyATfiILIAwgEH58IgwgBCAOfnwiBCACIAp+fCICQiCIIAIgBFStIAsgDFatIAQgDFStfHxCIIaEfCIEIA1UrXwgBCAEIA8gDiATfiIMIAogEH58IgpCIIggCiAMVK1CIIaEfCIKIA9UrSAKIAJCIIZ8IApUrXx8IgRWrXwiAkL/////////AFgEQCABQjGGIARC/////w+DIgEgA0L/////D4MiCn4iDEIAUq19QgAgDH0iECAEQiCIIgwgCn4iDSABIANCIIgiC358Ig5CIIYiD1StfSACQv////8PgyAKfiABIBJC/////w+DfnwgCyAMfnwgDSAOVq1CIIYgDkIgiIR8IAQgFEIgiH4gAyACQiCIfnwgAiALfnwgDCASfnxCIIZ8fSESIAZBAWshBiAQIA99DAELIARCIYghCyABQjCGIAJCP4YgBEIBiIQiBEL/////D4MiASADQv////8PgyIKfiIMQgBSrX1CACAMfSIOIAEgA0IgiCIMfiIQIAsgAkIfhoQiDUL/////D4MiDyAKfnwiC0IghiITVK19IAQgFEIgiH4gAyACQiGIfnwgAkIBiCICIAx+fCANIBJ+fEIghiAMIA9+IAJC/////w+DIAp+fCABIBJC/////w+DfnwgCyAQVK1CIIYgC0IgiIR8fH0hEiAOIBN9CyEBIAZBgIABTgRAIBFCgICAgICAwP//AIQhEUIAIQEMAQsgBkH//wBqIQcgBkGBgH9MBEACQCAHDQAgBCABQgGGIANWIBJCAYYgAUI/iIQiASAUViABIBRRG618IgEgBFStIAJC////////P4N8IgJCgICAgICAwACDUA0AIAIgEYQhEQwCC0IAIQEMAQsgBCABQgGGIANaIBJCAYYgAUI/iIQiASAUWiABIBRRG618IgEgBFStIAJC////////P4N8IAetQjCGfCARhCERCyAAIAE3AwAgACARNwMIIAVBwAFqJAAPCyAAQgA3AwAgAEKAgICAgIDg//8AIBEgAiADhFAbNwMIIAVBwAFqJAALxAECAX8CfkF/IQMCQCAAQgBSIAFC////////////AIMiBEKAgICAgIDA//8AViAEQoCAgICAgMD//wBRGw0AQQAgAkL///////////8AgyIFQoCAgICAgMD//wBWIAVCgICAgICAwP//AFEbDQAgACAEIAWEhFAEQEEADwsgASACg0IAWQRAQQAgASACUyABIAJRGw0BIAAgASAChYRCAFIPCyAAQgBSIAEgAlUgASACURsNACAAIAEgAoWEQgBSIQMLIAML8AMCBH8BfgJAAkACQAJ/IAAoAgQiASAAKAJoSQRAIAAgAUEBajYCBCABLQAADAELIAAQBwsiAUEraw4DAQABAAsgAUEwayECDAELIAFBLUYhBAJAAn8gACgCBCIBIAAoAmhJBEAgACABQQFqNgIEIAEtAAAMAQsgABAHCyIBQTBrIgJBCkkNACAAKAJoRQ0AIAAgACgCBEEBazYCBAsLAkAgAkEKSQRAQQAhAgNAIAEgAkEKbGohAgJ/IAAoAgQiASAAKAJoSQRAIAAgAUEBajYCBCABLQAADAELIAAQBwsiAUEwayIDQQlNQQAgAkEwayICQcyZs+YASBsNAAsgAqwhBQJAIANBCk8NAANAIAGtIAVCCn58QjB9IQUCfyAAKAIEIgEgACgCaEkEQCAAIAFBAWo2AgQgAS0AAAwBCyAAEAcLIgFBMGsiA0EJSw0BIAVCro+F18fC66MBUw0ACwsgA0EKSQRAA0ACfyAAKAIEIgEgACgCaEkEQCAAIAFBAWo2AgQgAS0AAAwBCyAAEAcLQTBrQQpJDQALCyAAKAJoBEAgACAAKAIEQQFrNgIEC0IAIAV9IAUgBBshBQwBC0KAgICAgICAgIB/IQUgACgCaEUNACAAIAAoAgRBAWs2AgRCgICAgICAgICAfw8LIAULvwIBAX8jAEHQAGsiBCQAAkAgA0GAgAFOBEAgBEEgaiABIAJCAEKAgICAgICA//8AEAYgBCkDKCECIAQpAyAhASADQf//AUgEQCADQf//AGshAwwCCyAEQRBqIAEgAkIAQoCAgICAgID//wAQBiADQf3/AiADQf3/AkgbQf7/AWshAyAEKQMYIQIgBCkDECEBDAELIANBgYB/Sg0AIARBQGsgASACQgBCgICAgICAwAAQBiAEKQNIIQIgBCkDQCEBIANBg4B+SgRAIANB/v8AaiEDDAELIARBMGogASACQgBCgICAgICAwAAQBiADQYaAfSADQYaAfUobQfz/AWohAyAEKQM4IQIgBCkDMCEBCyAEIAEgAkIAIANB//8Aaq1CMIYQBiAAIAQpAwg3AwggACAEKQMANwMAIARB0ABqJAAL1B0CC38QfiMAQUBqIgQkACADKAIMIQggAygCCCEMIAMoAgQhBSADKAIAIQkgASACQQd0QUBqIgZqIgcpAzggACAGaiIGKQM4hSEPIAcpAzAgBikDMIUhECAHKQMoIAYpAyiFIREgBykDICAGKQMghSESIAcpAxggBikDGIUhGiAHKQMQIAYpAxCFIRMgBykDCCAGKQMIhSEUIAcpAwAgBikDAIUhHSACQQF0QQJrIQ5BACECA0AgACACQQZ0IgtqIgYpAwAhGyAGKQMIIRwgBikDECEVIAYpAxghFiAGKQMgIRcgBikDKCEYIAYpAzAhGSABIAtqIgcgBikDOCAHKQM4hSIeNwM4IAcgGSAHKQMwhSIZNwMwIAcgGCAHKQMohSIYNwMoIAcgFyAHKQMghSIXNwMgIAcgFiAHKQMYhSIWNwMYIAcgFSAHKQMQhSIVNwMQIAcgHCAHKQMIhSIcNwMIIAcgGyAHKQMAhSIbNwMAIAQgEyAVhTcDECAEIBYgGoU3AxggBCASIBeFNwMgIAQgESAYhTcDKCAEIBAgGYU3AzAgBCAPIB6FNwM4IAQgGyAdhSIPNwMAIAQgFCAchSIQNwMIIAQgCSAPQvD/gYCA/h+DIhGnaiIKKQMAIA9C/////w+DIA9CIIh+fCAFIgcgEUIgiKdqIgUpAwCFIg83AwAgBCAFKQMIIAopAwggEEL/////D4MgEEIgiH58hTcDCCAIIAlqIgUgDzcDACAFIAQpAwg3AwggBCAEKQMQIg9CIIggD0L/////D4N+IAkgD0Lw/4GAgP4fgyIPp2oiBSkDAHwgByAPQiCIp2oiCikDAIUiDzcDECAEIAopAwggBSkDCCAEKQMYIhBCIIggEEL/////D4N+fIU3AxggByAIaiIFIA83AwAgBSAEKQMYNwMIIAQgBCkDICIPQiCIIA9C/////w+DfiAJIA9C8P+BgID+H4MiD6dqIgUpAwB8IAcgD0IgiKdqIgopAwCFIg83AyAgBCAKKQMIIAUpAwggBCkDKCIQQiCIIBBC/////w+DfnyFNwMoIAkgCEEQaiIFaiIKIA83AwAgCiAEKQMoNwMIIAQgBCkDMCIPQiCIIA9C/////w+DfiAJIA9C8P+BgID+H4MiD6dqIgopAwB8IAcgD0IgiKdqIg0pAwCFIg83AzAgBCANKQMIIAopAwggBCkDOCIQQiCIIBBC/////w+DfnyFNwM4IAUgB2oiBSAPNwMAIAUgBCkDODcDCCAEIAQpAwAiD0IgiCAPQv////8Pg34gCSAPQvD/gYCA/h+DIg+naiIFKQMAfCAHIA9CIIinaiIKKQMAhSIPNwMAIAQgCikDCCAFKQMIIAQpAwgiEEIgiCAQQv////8Pg358hTcDCCAJIAhBIGoiBWoiCiAPNwMAIAogBCkDCDcDCCAEIAQpAxAiD0IgiCAPQv////8Pg34gCSAPQvD/gYCA/h+DIg+naiIKKQMAfCAHIA9CIIinaiINKQMAhSIPNwMQIAQgDSkDCCAKKQMIIAQpAxgiEEIgiCAQQv////8Pg358hTcDGCAFIAdqIgUgDzcDACAFIAQpAxg3AwggBCAEKQMgIg9CIIggD0L/////D4N+IAkgD0Lw/4GAgP4fgyIPp2oiBSkDAHwgByAPQiCIp2oiCikDAIU3AyAgBCAKKQMIIAUpAwggBCkDKCIPQiCIIA9C/////w+DfnyFNwMoIAQgBCkDMCIPQiCIIA9C/////w+DfiAJIA9C8P+BgID+H4MiD6dqIgUpAwB8IAcgD0IgiKdqIgopAwCFNwMwIAQgCikDCCAFKQMIIAQpAzgiD0IgiCAPQv////8Pg358hTcDOCAEIAQpAwAiD0IgiCAPQv////8Pg34gCSAPQvD/gYCA/h+DIg+naiIFKQMAfCAHIA9CIIinaiIKKQMAhSIPNwMAIAQgCikDCCAFKQMIIAQpAwgiEEIgiCAQQv////8Pg358hTcDCCAJIAhBMGoiBWoiCiAPNwMAIAogBCkDCDcDCCAEIAQpAxAiD0IgiCAPQv////8Pg34gCSAPQvD/gYCA/h+DIg+naiIKKQMAfCAHIA9CIIinaiINKQMAhSIPNwMQIAQgDSkDCCAKKQMIIAQpAxgiEEIgiCAQQv////8Pg358hTcDGCAFIAdqIgUgDzcDACAFIAQpAxg3AwggBCAEKQMgIg9CIIggD0L/////D4N+IAkgD0Lw/4GAgP4fgyIPp2oiBSkDAHwgByAPQiCIp2oiCikDAIUiDzcDICAEIAopAwggBSkDCCAEKQMoIhBCIIggEEL/////D4N+fIUiEDcDKCAEIAQpAzAiEUIgiCARQv////8Pg34gCSARQvD/gYCA/h+DIhGnaiIFKQMAfCAHIBFCIIinaiIKKQMAhSIRNwMwIAopAwghEyAFKQMIIRQgBCkDOCESIAYgBCkDACIdNwMAIAYgBCkDCCIbNwMIIAYgBCkDECIcNwMQIAQpAxghGiAGIBMgFCASQv////8PgyASQiCIfnyFIhI3AzggBiARNwMwIAYgEDcDKCAGIA83AyAgBiAaNwMYIAAgC0HAAHIiBWoiBikDACETIAYpAwghFCAGKQMQIRUgBikDGCEWIAYpAyAhFyAGKQMoIRggBikDMCEZIAEgBWoiBSAGKQM4IAUpAziFIh43AzggBSAZIAUpAzCFIhk3AzAgBSAYIAUpAyiFIhg3AyggBSAXIAUpAyCFIhc3AyAgBSAWIAUpAxiFIhY3AxggBSAVIAUpAxCFIhU3AxAgBSAUIAUpAwiFIhQ3AwggBSATIAUpAwCFIhM3AwAgBCAVIByFNwMQIAQgFiAahTcDGCAEIA8gF4U3AyAgBCAQIBiFNwMoIAQgESAZhTcDMCAEIBIgHoU3AzggBCATIB2FIg83AwAgBCAUIBuFIhA3AwggBCAMIgUgD0Lw/4GAgP4fgyIRp2oiDCkDACAPQv////8PgyAPQiCIfnwgCSARQiCIp2oiCykDAIUiDzcDACAEIAspAwggDCkDCCAQQv////8PgyAQQiCIfnyFNwMIIAUgCEFAa0Hw/wFxIgxqIgggDzcDACAIIAQpAwg3AwggBCAEKQMQIg9CIIggD0L/////D4N+IAUgD0Lw/4GAgP4fgyIPp2oiCCkDAHwgCSAPQiCIp2oiCykDAIUiDzcDECAEIAspAwggCCkDCCAEKQMYIhBCIIggEEL/////D4N+fIU3AxggCSAMaiIIIA83AwAgCCAEKQMYNwMIIAQgBCkDICIPQiCIIA9C/////w+DfiAFIA9C8P+BgID+H4MiD6dqIggpAwB8IAkgD0IgiKdqIgspAwCFIg83AyAgBCALKQMIIAgpAwggBCkDKCIQQiCIIBBC/////w+DfnyFNwMoIAUgDEEQaiIIaiILIA83AwAgCyAEKQMoNwMIIAQgBCkDMCIPQiCIIA9C/////w+DfiAFIA9C8P+BgID+H4MiD6dqIgspAwB8IAkgD0IgiKdqIgopAwCFIg83AzAgBCAKKQMIIAspAwggBCkDOCIQQiCIIBBC/////w+DfnyFNwM4IAggCWoiCCAPNwMAIAggBCkDODcDCCAEIAQpAwAiD0IgiCAPQv////8Pg34gBSAPQvD/gYCA/h+DIg+naiIIKQMAfCAJIA9CIIinaiILKQMAhSIPNwMAIAQgCykDCCAIKQMIIAQpAwgiEEIgiCAQQv////8Pg358hTcDCCAFIAxBIGoiCGoiCyAPNwMAIAsgBCkDCDcDCCAEIAQpAxAiD0IgiCAPQv////8Pg34gBSAPQvD/gYCA/h+DIg+naiILKQMAfCAJIA9CIIinaiIKKQMAhSIPNwMQIAQgCikDCCALKQMIIAQpAxgiEEIgiCAQQv////8Pg358hTcDGCAIIAlqIgggDzcDACAIIAQpAxg3AwggBCAEKQMgIg9CIIggD0L/////D4N+IAUgD0Lw/4GAgP4fgyIPp2oiCCkDAHwgCSAPQiCIp2oiCykDAIU3AyAgBCALKQMIIAgpAwggBCkDKCIPQiCIIA9C/////w+DfnyFNwMoIAQgBCkDMCIPQiCIIA9C/////w+DfiAFIA9C8P+BgID+H4MiD6dqIggpAwB8IAkgD0IgiKdqIgspAwCFNwMwIAQgCykDCCAIKQMIIAQpAzgiD0IgiCAPQv////8Pg358hTcDOCAEIAQpAwAiD0IgiCAPQv////8Pg34gBSAPQvD/gYCA/h+DIg+naiIIKQMAfCAJIA9CIIinaiILKQMAhSIPNwMAIAQgCykDCCAIKQMIIAQpAwgiEEIgiCAQQv////8Pg358hTcDCCAFIAxBMGoiCGoiCyAPNwMAIAsgBCkDCDcDCCAEIAQpAxAiD0IgiCAPQv////8Pg34gBSAPQvD/gYCA/h+DIg+naiILKQMAfCAJIA9CIIinaiIKKQMAhSIPNwMQIAQgCikDCCALKQMIIAQpAxgiEEIgiCAQQv////8Pg358hTcDGCAIIAlqIgggDzcDACAIIAQpAxg3AwggBCAEKQMgIg9CIIggD0L/////D4N+IAUgD0Lw/4GAgP4fgyIPp2oiCCkDAHwgCSAPQiCIp2oiCykDAIUiEjcDICAEIAspAwggCCkDCCAEKQMoIg9CIIggD0L/////D4N+fIUiETcDKCAEIAQpAzAiD0IgiCAPQv////8Pg34gBSAPQvD/gYCA/h+DIg+naiIIKQMAfCAJIA9CIIinaiILKQMAhSIQNwMwIAQgCykDCCAIKQMIIAQpAzgiD0IgiCAPQv////8Pg358hSIPNwM4IAxBQGtB8P8BcSEIIAIgDk9FBEAgBiAEKQMAIh03AwAgBiAEKQMIIhQ3AwggBiAEKQMQIhM3AxAgBiAEKQMYIho3AxggBiASNwMgIAYgETcDKCAGIBA3AzAgBiAPNwM4IAJBAmohAiAJIQwgByEJDAELCyADIAg2AgwgAyAJNgIIIAMgBTYCBCADIAc2AgAgBCAGQQEQDCAEKAIAIQAgBEFAayQAIAALNQAgACABNwMAIAAgAkL///////8/gyAEQjCIp0GAgAJxIAJCMIinQf//AXFyrUIwhoQ3AwgLtQgBCn8gAyABQQd0aiIGIQwDQCAGIAAgCEEGdCIJaiIHKAAANgIAIAYgBygABDYCBCAGIAcoAAg2AgggBiAHKAAMNgIMIAYgBygAEDYCECAGIAcoABQ2AhQgBiAHKAAYNgIYIAYgBygAHDYCHCAGIAcoACA2AiAgBiAHKAAkNgIkIAYgBygAKDYCKCAGIAcoACw2AiwgBiAHKAAwNgIwIAYgBygANCIKNgI0IAwgBygAOCILNgI4IAYgBygAPCINNgI8IAMgCWoiByAGNQIAIAY1AhRCIIaENwMAIAcgBjUCKCANrUIghoQ3AwggByAGNQIQIAY1AiRCIIaENwMQIAcgC60gBjUCDEIghoQ3AxggByAGNQIgIAqtQiCGhDcDICAHIAY1AgggBjUCHEIghoQ3AyggByAGNQIwIAY1AgRCIIaENwMwIAcgBjUCGCAGNQIsQiCGhDcDOCAIQQFqIghBAkcNAAtBASEIIAFBAUsEQANAIAhBB3QgA2oiB0GAAWsgB0EBIAUQIiAIQQFqIgggAUcNAAsLIAMgBiABIAUQIiAGIAYgAUEBdCIJQQZ0IgtqIgYgASAFECIgBiALakFAaigCACEKQQEhByACQQNPBEAgAkEBdiEOQQIhBwNAIAciDCAHQX9zIAJqIAcgDkkbIg9BAk8EQCAMQQFrIQ1BASEHIAYhCANAIAggC2oiBiADIAggAyAHIAogDXFqQQFrIAlsQQZ0aiAGIAEgBRAbIA1xIAdqIAlsQQZ0aiAGIAtqIgYgASAFEBshCiAGIQggB0ECaiIHIA9JDQALCyAMQQF0IgcgAkkNAAsgDEH+////B3EhBwsgBiALaiIIIAMgB0F/cyACaiAGIAMgAiAHayAHQQFrIgIgCnFqQQJrIAlsQQZ0aiAIIAEgBRAbIAJxaiAJbEEGdGogBCABIAUQGxogCQRAIAQgCUEGdGoiASEDQQAhCgNAIAEgBCAKQQZ0IgVqIgIoAgA2AAAgASACKAIENgAEIAEgAigCCDYACCABIAIoAgw2AAwgASACKAIQNgAQIAEgAigCFDYAFCABIAIoAhg2ABggASACKAIcNgAcIAEgAigCIDYAICABIAIoAiQ2ACQgASACKAIoNgAoIAEgAigCLDYALCABIAIoAjA2ADAgASACKAI0NgA0IAMgAigCODYAOCABIAIoAjw2ADwgACAFaiICIAEpAwA+AgAgAiABNQI0PgIEIAIgASkDKD4CCCACIAE1Ahw+AgwgAiABKQMQPgIQIAIgATUCBD4CFCACIAMpAzg+AhggAiABNQIsPgIcIAIgASkDID4CICACIAE1AhQ+AiQgAiABKQMIPgIoIAIgAzUCPD4CLCACIAEpAzA+AjAgAiABNQIkPgI0IAIgASkDGD4COCACIAE1Agw+AjwgCkEBaiIKIAlHDQALCwu7AgACQCABQRRLDQACQAJAAkACQAJAAkACQAJAAkACQCABQQlrDgoAAQIDBAUGBwgJCgsgAiACKAIAIgFBBGo2AgAgACABKAIANgIADwsgAiACKAIAIgFBBGo2AgAgACABNAIANwMADwsgAiACKAIAIgFBBGo2AgAgACABNQIANwMADwsgAiACKAIAQQdqQXhxIgFBCGo2AgAgACABKQMANwMADwsgAiACKAIAIgFBBGo2AgAgACABMgEANwMADwsgAiACKAIAIgFBBGo2AgAgACABMwEANwMADwsgAiACKAIAIgFBBGo2AgAgACABMAAANwMADwsgAiACKAIAIgFBBGo2AgAgACABMQAANwMADwsgAiACKAIAQQdqQXhxIgFBCGo2AgAgACABKwMAOQMADwsgACACQQARAgALC0oBA38gACgCACwAAEEwa0EKSQRAA0AgACgCACIBLAAAIQMgACABQQFqNgIAIAMgAkEKbGpBMGshAiABLAABQTBrQQpJDQALCyACCxEAIABFBEBBAA8LIAAgARBRC4cHAQl/IAUgAUEHdGohByABQQF0IgoEQCAFIApBBnRqIgkhDQNAIAcgACAMQQZ0IgtqIggoAAA2AgAgByAIKAAENgIEIAkgCCgACDYCCCAHIAgoAAw2AgwgCSAIKAAQNgIQIAcgCCgAFDYCFCAJIAgoABg2AhggByAIKAAcNgIcIAkgCCgAIDYCICAHIAgoACQ2AiQgCSAIKAAoNgIoIAcgCCgALDYCLCAJIAgoADA2AjAgByAIKAA0Ig42AjQgDSAIKAA4Ig82AjggByAIKAA8Igg2AjwgBSALaiILIAc1AgAgBzUCFEIghoQ3AwAgCyAJNQIoIAitQiCGhDcDCCALIAk1AhAgBzUCJEIghoQ3AxAgCyAPrSAHNQIMQiCGhDcDGCALIAk1AiAgDq1CIIaENwMgIAsgCTUCCCAHNQIcQiCGhDcDKCALIAk1AjAgBzUCBEIghoQ3AzAgCyAJNQIYIAc1AixCIIaENwM4IAxBAWoiDCAKRw0ACwsgAkEBayICIApBBnQgBWpBQGooAgBxIQwCQCADQQNPBEADQCAFIAQgBSAEIAogDGxBBnRqIAEgBigCACAGKAIEECQgAnEgCmxBBnRqIAEgBigCACAGKAIEECQgAnEhDCADQQJrIgMNAAwCCwALIAcgBCAFIAQgCiAMbEEGdGogByABIAYQEiACcSAKbEEGdGogBSABIAYQEhoLIAoEQCAFIApBBnRqIgYhA0EAIQIDQCAHIAUgAkEGdCIBaiIEKAIANgAAIAcgBCgCBDYABCAGIAQoAgg2AAggByAEKAIMNgAMIAYgBCgCEDYAECAHIAQoAhQ2ABQgBiAEKAIYNgAYIAcgBCgCHDYAHCAGIAQoAiA2ACAgByAEKAIkNgAkIAYgBCgCKDYAKCAHIAQoAiw2ACwgBiAEKAIwNgAwIAcgBCgCNDYANCADIAQoAjg2ADggByAEKAI8NgA8IAAgAWoiASAHKQMAPgIAIAEgBjUCND4CBCABIAYpAyg+AgggASAGNQIcPgIMIAEgBikDED4CECABIAc1AgQ+AhQgASADKQM4PgIYIAEgBjUCLD4CHCABIAYpAyA+AiAgASAGNQIUPgIkIAEgBikDCD4CKCABIAM1Ajw+AiwgASAGKQMwPgIwIAEgBjUCJD4CNCABIAYpAxg+AjggASAGNQIMPgI8IAJBAWoiAiAKRw0ACwsL7QoCBH8EfiMAQYABayIEJAAgBEGwCykDACIHNwNQIARBuAspAwAiCDcDWCAEQaALKQMAIgk3A0AgBEGoCykDACIKNwNIIAJBeE4EQCACQQN0IQUgASACaiEGA0AgAkE/TARAIARCADcDOCAEQgA3AzAgBEIANwMoIARCADcDICAEQgA3AxggBEIANwMQIARCADcDCCAEQgA3AwALIAQgBiACayACQQAgAkEAShsiAUHAACABQcAASBsQBSEBIAJBP00EQCABIAJqQYABOgAACyABIAEoAgAiA0EYdCADQQh0QYCA/AdxciADQQh2QYD+A3EgA0EYdnJyNgIAIAEgASgCBCIDQRh0IANBCHRBgID8B3FyIANBCHZBgP4DcSADQRh2cnI2AgQgASABKAIIIgNBGHQgA0EIdEGAgPwHcXIgA0EIdkGA/gNxIANBGHZycjYCCCABIAEoAgwiA0EYdCADQQh0QYCA/AdxciADQQh2QYD+A3EgA0EYdnJyNgIMIAEgASgCECIDQRh0IANBCHRBgID8B3FyIANBCHZBgP4DcSADQRh2cnI2AhAgASABKAIUIgNBGHQgA0EIdEGAgPwHcXIgA0EIdkGA/gNxIANBGHZycjYCFCABIAEoAhgiA0EYdCADQQh0QYCA/AdxciADQQh2QYD+A3EgA0EYdnJyNgIYIAEgASgCHCIDQRh0IANBCHRBgID8B3FyIANBCHZBgP4DcSADQRh2cnI2AhwgASABKAIgIgNBGHQgA0EIdEGAgPwHcXIgA0EIdkGA/gNxIANBGHZycjYCICABIAEoAiQiA0EYdCADQQh0QYCA/AdxciADQQh2QYD+A3EgA0EYdnJyNgIkIAEgASgCKCIDQRh0IANBCHRBgID8B3FyIANBCHZBgP4DcSADQRh2cnI2AiggASABKAIsIgNBGHQgA0EIdEGAgPwHcXIgA0EIdkGA/gNxIANBGHZycjYCLCABIAEoAjAiA0EYdCADQQh0QYCA/AdxciADQQh2QYD+A3EgA0EYdnJyNgIwIAEgASgCNCIDQRh0IANBCHRBgID8B3FyIANBCHZBgP4DcSADQRh2cnI2AjQgASABKAI4IgNBGHQgA0EIdEGAgPwHcXIgA0EIdkGA/gNxIANBGHZycjYCOCABIAUgASgCPCIDQRh0IANBCHRBgID8B3FyIANBCHZBgP4DcSADQRh2cnIgAkE4SBs2AjwgAUFAayABEDQgAkE3SiEBIAJBQGohAiABDQALCyAEQfgLKQMANwN4IARB8AspAwA3A3AgBEHoCykDADcDaCAEIAc3AxAgBCAINwMYIARB4AspAwA3A2AgBCAJNwMAIAQgCjcDCCAEIARBQGsQNCAAIAQoAgAiAUEYdCABQQh0QYCA/AdxciABQQh2QYD+A3EgAUEYdnJyNgAAIAAgBCgCBCIBQRh0IAFBCHRBgID8B3FyIAFBCHZBgP4DcSABQRh2cnI2AAQgACAEKAIIIgFBGHQgAUEIdEGAgPwHcXIgAUEIdkGA/gNxIAFBGHZycjYACCAAIAQoAgwiAUEYdCABQQh0QYCA/AdxciABQQh2QYD+A3EgAUEYdnJyNgAMIAAgBCgCECIBQRh0IAFBCHRBgID8B3FyIAFBCHZBgP4DcSABQRh2cnI2ABAgACAEKAIUIgFBGHQgAUEIdEGAgPwHcXIgAUEIdkGA/gNxIAFBGHZycjYAFCAAIAQoAhgiAUEYdCABQQh0QYCA/AdxciABQQh2QYD+A3EgAUEYdnJyNgAYIAAgBCgCHCIAQRh0IABBCHRBgID8B3FyIABBCHZBgP4DcSAAQRh2cnI2ABwgBEGAAWokAAuRLgINfwJ+IwBBgAJrIgskACALIAEpAjgiDzcDOCALIAEpAjA3AzAgCyABKQIoNwMoIAsgASkCIDcDICALIAEpAhg3AxggCyABKQIQNwMQIAsgASkCACIQNwMAIAsgASkCCDcDCCAPpyEIIBCnIQVBECEGA0AgCyAGQQJ0IgdqIgEgAUEcaygCACAIQQ93IAhBDXdzIAhBCnZzaiAFaiABQTxrKAIAIgVBGXcgBUEOd3MgBUEDdnNqIgg2AgAgCyAHQQRyaiAFIAFBGGsoAgBqIAFBBGsoAgAiBUEPdyAFQQ13cyAFQQp2c2ogAUE4aygCACIFQRl3IAVBDndzIAVBA3ZzajYCACAGQT5JIQEgBkECaiEGIAENAAsgCygC/AEhDiALKAL4ASEMIAsoAvQBIQ0gACALKAIAIAAoAhwgACgCECIHQRp3IAdBFXdzIAdBB3dzamogACgCGCIFIAAoAhQiBnMgB3EgBXNqQZjfqJQEaiIJIAAoAgAiAUEedyABQRN3cyABQQp3c2ogACgCCCICIAAoAgQiA3IgAXEgAiADcXJqIghBHncgCEETd3MgCEEKd3MgCCABIANycSABIANxcmogBSALKAIEaiAJIAAoAgxqIgkgBiAHc3EgBnNqIAlBGncgCUEVd3MgCUEHd3NqQZGJ3YkHaiIEaiIFQR53IAVBE3dzIAVBCndzIAUgASAIcnEgASAIcXJqIAYgCygCCGogAiAEaiICIAcgCXNxIAdzaiACQRp3IAJBFXdzIAJBB3dzakGxiPzRBGsiBGoiBkEedyAGQRN3cyAGQQp3cyAGIAUgCHJxIAUgCHFyaiAHIAsoAgxqIAMgBGoiAyACIAlzcSAJc2ogA0EadyADQRV3cyADQQd3c2pB28iosgFrIgRqIgdBHncgB0ETd3MgB0EKd3MgByAFIAZycSAFIAZxcmogCSALKAIQaiABIARqIgQgAiADc3EgAnNqIARBGncgBEEVd3MgBEEHd3NqQduE28oDaiIKaiIJQR53IAlBE3dzIAlBCndzIAkgBiAHcnEgBiAHcXJqIAIgCygCFGogCCAKaiICIAMgBHNxIANzaiACQRp3IAJBFXdzIAJBB3dzakHxo8TPBWoiCmoiCEEedyAIQRN3cyAIQQp3cyAIIAcgCXJxIAcgCXFyaiADIAsoAhhqIAUgCmoiAyACIARzcSAEc2ogA0EadyADQRV3cyADQQd3c2pB3PqB7gZrIgpqIgVBHncgBUETd3MgBUEKd3MgBSAIIAlycSAIIAlxcmogCygCHCAEaiAGIApqIgQgAiADc3EgAnNqIARBGncgBEEVd3MgBEEHd3NqQavCjqcFayIKaiIGQR53IAZBE3dzIAZBCndzIAYgBSAIcnEgBSAIcXJqIAsoAiAgAmogByAKaiICIAMgBHNxIANzaiACQRp3IAJBFXdzIAJBB3dzakHoquG/AmsiCmoiB0EedyAHQRN3cyAHQQp3cyAHIAUgBnJxIAUgBnFyaiALKAIkIANqIAkgCmoiAyACIARzcSAEc2ogA0EadyADQRV3cyADQQd3c2pBgbaNlAFqIgpqIglBHncgCUETd3MgCUEKd3MgCSAGIAdycSAGIAdxcmogCygCKCAEaiAIIApqIgQgAiADc3EgAnNqIARBGncgBEEVd3MgBEEHd3NqQb6LxqECaiIKaiIIQR53IAhBE3dzIAhBCndzIAggByAJcnEgByAJcXJqIAsoAiwgAmogBSAKaiICIAMgBHNxIANzaiACQRp3IAJBFXdzIAJBB3dzakHD+7GoBWoiCmoiBUEedyAFQRN3cyAFQQp3cyAFIAggCXJxIAggCXFyaiALKAIwIANqIAYgCmoiAyACIARzcSAEc2ogA0EadyADQRV3cyADQQd3c2pB9Lr5lQdqIgpqIgZBHncgBkETd3MgBkEKd3MgBiAFIAhycSAFIAhxcmogCygCNCAEaiAHIApqIgQgAiADc3EgAnNqIARBGncgBEEVd3MgBEEHd3NqQYKchfkHayIKaiIHQR53IAdBE3dzIAdBCndzIAcgBSAGcnEgBSAGcXJqIAsoAjggAmogCSAKaiICIAMgBHNxIANzaiACQRp3IAJBFXdzIAJBB3dzakHZ8o+hBmsiCmoiCUEedyAJQRN3cyAJQQp3cyAJIAYgB3JxIAYgB3FyaiALKAI8IANqIAggCmoiAyACIARzcSAEc2ogA0EadyADQRV3cyADQQd3c2pBjJ2Q8wNrIgpqIghBHncgCEETd3MgCEEKd3MgCCAHIAlycSAHIAlxcmogCygCQCAEaiAFIApqIgQgAiADc3EgAnNqIARBGncgBEEVd3MgBEEHd3NqQb+sktsBayIKaiIFQR53IAVBE3dzIAVBCndzIAUgCCAJcnEgCCAJcXJqIAsoAkQgAmogBiAKaiICIAMgBHNxIANzaiACQRp3IAJBFXdzIAJBB3dzakH68IaCAWsiCmoiBkEedyAGQRN3cyAGQQp3cyAGIAUgCHJxIAUgCHFyaiALKAJIIANqIAcgCmoiAyACIARzcSAEc2ogA0EadyADQRV3cyADQQd3c2pBxruG/gBqIgpqIgdBHncgB0ETd3MgB0EKd3MgByAFIAZycSAFIAZxcmogCygCTCAEaiAJIApqIgQgAiADc3EgAnNqIARBGncgBEEVd3MgBEEHd3NqQczDsqACaiIKaiIJQR53IAlBE3dzIAlBCndzIAkgBiAHcnEgBiAHcXJqIAsoAlAgAmogCCAKaiICIAMgBHNxIANzaiACQRp3IAJBFXdzIAJBB3dzakHv2KTvAmoiCmoiCEEedyAIQRN3cyAIQQp3cyAIIAcgCXJxIAcgCXFyaiALKAJUIANqIAUgCmoiAyACIARzcSAEc2ogA0EadyADQRV3cyADQQd3c2pBqonS0wRqIgpqIgVBHncgBUETd3MgBUEKd3MgBSAIIAlycSAIIAlxcmogCygCWCAEaiAGIApqIgQgAiADc3EgAnNqIARBGncgBEEVd3MgBEEHd3NqQdzTwuUFaiIKaiIGQR53IAZBE3dzIAZBCndzIAYgBSAIcnEgBSAIcXJqIAsoAlwgAmogByAKaiICIAMgBHNxIANzaiACQRp3IAJBFXdzIAJBB3dzakHakea3B2oiCmoiB0EedyAHQRN3cyAHQQp3cyAHIAUgBnJxIAUgBnFyaiALKAJgIANqIAkgCmoiAyACIARzcSAEc2ogA0EadyADQRV3cyADQQd3c2pBrt2GvgZrIgpqIglBHncgCUETd3MgCUEKd3MgCSAGIAdycSAGIAdxcmogCygCZCAEaiAIIApqIgQgAiADc3EgAnNqIARBGncgBEEVd3MgBEEHd3NqQZPzuL4FayIKaiIIQR53IAhBE3dzIAhBCndzIAggByAJcnEgByAJcXJqIAsoAmggAmogBSAKaiICIAMgBHNxIANzaiACQRp3IAJBFXdzIAJBB3dzakG4sPP/BGsiCmoiBUEedyAFQRN3cyAFQQp3cyAFIAggCXJxIAggCXFyaiALKAJsIANqIAYgCmoiAyACIARzcSAEc2ogA0EadyADQRV3cyADQQd3c2pBuYCahQRrIgpqIgZBHncgBkETd3MgBkEKd3MgBiAFIAhycSAFIAhxcmogCygCcCAEaiAHIApqIgQgAiADc3EgAnNqIARBGncgBEEVd3MgBEEHd3NqQY3o/8gDayIKaiIHQR53IAdBE3dzIAdBCndzIAcgBSAGcnEgBSAGcXJqIAsoAnQgAmogCSAKaiICIAMgBHNxIANzaiACQRp3IAJBFXdzIAJBB3dzakG53eHSAmsiCmoiCUEedyAJQRN3cyAJQQp3cyAJIAYgB3JxIAYgB3FyaiALKAJ4IANqIAggCmoiAyACIARzcSAEc2ogA0EadyADQRV3cyADQQd3c2pB0capNmoiCmoiCEEedyAIQRN3cyAIQQp3cyAIIAcgCXJxIAcgCXFyaiALKAJ8IARqIAUgCmoiBCACIANzcSACc2ogBEEadyAEQRV3cyAEQQd3c2pB59KkoQFqIgpqIgVBHncgBUETd3MgBUEKd3MgBSAIIAlycSAIIAlxcmogCygCgAEgAmogBiAKaiICIAMgBHNxIANzaiACQRp3IAJBFXdzIAJBB3dzakGFldy9AmoiCmoiBkEedyAGQRN3cyAGQQp3cyAGIAUgCHJxIAUgCHFyaiALKAKEASADaiAHIApqIgMgAiAEc3EgBHNqIANBGncgA0EVd3MgA0EHd3NqQbjC7PACaiIKaiIHQR53IAdBE3dzIAdBCndzIAcgBSAGcnEgBSAGcXJqIAsoAogBIARqIAkgCmoiBCACIANzcSACc2ogBEEadyAEQRV3cyAEQQd3c2pB/Nux6QRqIgpqIglBHncgCUETd3MgCUEKd3MgCSAGIAdycSAGIAdxcmogCygCjAEgAmogCCAKaiICIAMgBHNxIANzaiACQRp3IAJBFXdzIAJBB3dzakGTmuCZBWoiCmoiCEEedyAIQRN3cyAIQQp3cyAIIAcgCXJxIAcgCXFyaiALKAKQASADaiAFIApqIgMgAiAEc3EgBHNqIANBGncgA0EVd3MgA0EHd3NqQdTmqagGaiIKaiIFQR53IAVBE3dzIAVBCndzIAUgCCAJcnEgCCAJcXJqIAsoApQBIARqIAYgCmoiBCACIANzcSACc2ogBEEadyAEQRV3cyAEQQd3c2pBu5WoswdqIgpqIgZBHncgBkETd3MgBkEKd3MgBiAFIAhycSAFIAhxcmogCygCmAEgAmogByAKaiICIAMgBHNxIANzaiACQRp3IAJBFXdzIAJBB3dzakHS7fTxB2siCmoiB0EedyAHQRN3cyAHQQp3cyAHIAUgBnJxIAUgBnFyaiALKAKcASADaiAJIApqIgMgAiAEc3EgBHNqIANBGncgA0EVd3MgA0EHd3NqQfumt+wGayIKaiIJQR53IAlBE3dzIAlBCndzIAkgBiAHcnEgBiAHcXJqIAsoAqABIARqIAggCmoiBCACIANzcSACc2ogBEEadyAEQRV3cyAEQQd3c2pB366A6gVrIgpqIghBHncgCEETd3MgCEEKd3MgCCAHIAlycSAHIAlxcmogCygCpAEgAmogBSAKaiICIAMgBHNxIANzaiACQRp3IAJBFXdzIAJBB3dzakG1s5a/BWsiCmoiBUEedyAFQRN3cyAFQQp3cyAFIAggCXJxIAggCXFyaiALKAKoASADaiAGIApqIgMgAiAEc3EgBHNqIANBGncgA0EVd3MgA0EHd3NqQZDp0e0DayIKaiIGQR53IAZBE3dzIAZBCndzIAYgBSAIcnEgBSAIcXJqIAsoAqwBIARqIAcgCmoiBCACIANzcSACc2ogBEEadyAEQRV3cyAEQQd3c2pB3dzOxANrIgpqIgdBHncgB0ETd3MgB0EKd3MgByAFIAZycSAFIAZxcmogCygCsAEgAmogCSAKaiICIAMgBHNxIANzaiACQRp3IAJBFXdzIAJBB3dzakHnr7TzAmsiCmoiCUEedyAJQRN3cyAJQQp3cyAJIAYgB3JxIAYgB3FyaiALKAK0ASADaiAIIApqIgMgAiAEc3EgBHNqIANBGncgA0EVd3MgA0EHd3NqQdzzm8sCayIKaiIIQR53IAhBE3dzIAhBCndzIAggByAJcnEgByAJcXJqIAsoArgBIARqIAUgCmoiBCACIANzcSACc2ogBEEadyAEQRV3cyAEQQd3c2pB+5TH3wBrIgpqIgVBHncgBUETd3MgBUEKd3MgBSAIIAlycSAIIAlxcmogCygCvAEgAmogBiAKaiICIAMgBHNxIANzaiACQRp3IAJBFXdzIAJBB3dzakHwwKqDAWoiCmoiBkEedyAGQRN3cyAGQQp3cyAGIAUgCHJxIAUgCHFyaiALKALAASADaiAHIApqIgMgAiAEc3EgBHNqIANBGncgA0EVd3MgA0EHd3NqQZaCk80BaiIKaiIHQR53IAdBE3dzIAdBCndzIAcgBSAGcnEgBSAGcXJqIAsoAsQBIARqIAkgCmoiBCACIANzcSACc2ogBEEadyAEQRV3cyAEQQd3c2pBiNjd8QFqIgpqIglBHncgCUETd3MgCUEKd3MgCSAGIAdycSAGIAdxcmogCygCyAEgAmogCCAKaiICIAMgBHNxIANzaiACQRp3IAJBFXdzIAJBB3dzakHM7qG6AmoiCmoiCEEedyAIQRN3cyAIQQp3cyAIIAcgCXJxIAcgCXFyaiALKALMASADaiAFIApqIgMgAiAEc3EgBHNqIANBGncgA0EVd3MgA0EHd3NqQbX5wqUDaiIKaiIFQR53IAVBE3dzIAVBCndzIAUgCCAJcnEgCCAJcXJqIAsoAtABIARqIAYgCmoiBCACIANzcSACc2ogBEEadyAEQRV3cyAEQQd3c2pBs5nwyANqIgpqIgZBHncgBkETd3MgBkEKd3MgBiAFIAhycSAFIAhxcmogCygC1AEgAmogByAKaiICIAMgBHNxIANzaiACQRp3IAJBFXdzIAJBB3dzakHK1OL2BGoiCmoiB0EedyAHQRN3cyAHQQp3cyAHIAUgBnJxIAUgBnFyaiALKALYASADaiAJIApqIgMgAiAEc3EgBHNqIANBGncgA0EVd3MgA0EHd3NqQc+U89wFaiIKaiIJQR53IAlBE3dzIAlBCndzIAkgBiAHcnEgBiAHcXJqIAsoAtwBIARqIAggCmoiBCACIANzcSACc2ogBEEadyAEQRV3cyAEQQd3c2pB89+5wQZqIgpqIghBHncgCEETd3MgCEEKd3MgCCAHIAlycSAHIAlxcmogCygC4AEgAmogBSAKaiICIAMgBHNxIANzaiACQRp3IAJBFXdzIAJBB3dzakHuhb6kB2oiCmoiBUEedyAFQRN3cyAFQQp3cyAFIAggCXJxIAggCXFyaiALKALkASADaiAGIApqIgMgAiAEc3EgBHNqIANBGncgA0EVd3MgA0EHd3NqQe/GlcUHaiIKaiIGQR53IAZBE3dzIAZBCndzIAYgBSAIcnEgBSAIcXJqIAsoAugBIARqIAcgCmoiBCACIANzcSACc2ogBEEadyAEQRV3cyAEQQd3c2pB7I/e2QdrIgpqIgdBHncgB0ETd3MgB0EKd3MgByAFIAZycSAFIAZxcmogCygC7AEgAmogCSAKaiICIAMgBHNxIANzaiACQRp3IAJBFXdzIAJBB3dzakH4++OZB2siCmoiCUEedyAJQRN3cyAJQQp3cyAJIAYgB3JxIAYgB3FyaiALKALwASADaiAIIApqIgMgAiAEc3EgBHNqIANBGncgA0EVd3MgA0EHd3NqQYaAhPoGayIKaiIIIAAoAgxqNgIMIAAgBSAKaiIFIAAoAhxqNgIcIAAgBCANaiAFIAIgA3NxIAJzaiAFQRp3IAVBFXdzIAVBB3dzakGVpr7dBWsiDSAIIAcgCXJxIAcgCXFyIAhBHncgCEETd3MgCEEKd3NqaiIEIAAoAghqNgIIIAAgBiANaiIGIAAoAhhqNgIYIAAgAiAMaiAGIAMgBXNxIANzaiAGQRp3IAZBFXdzIAZBB3dzakGJuJmIBGsiDCAEIAggCXJxIAggCXFyIARBHncgBEETd3MgBEEKd3NqaiICIAAoAgRqNgIEIAAgByAMaiIHIAAoAhRqNgIUIAAgASADIA5qIAcgBSAGc3EgBXNqIAdBGncgB0EVd3MgB0EHd3NqQY6OuswDayIFIAIgBCAIcnEgBCAIcXIgAkEedyACQRN3cyACQQp3c2pqajYCACAAIAAoAhAgBSAJamo2AhAgC0GAAmokAAuTCAEKf0EBIQ0gAyABQQd0aiEGIAFBAXQiCgRAIAMgCkEGdGoiCCEPA0AgBiAAIAtBBnQiCWoiBygAADYCACAGIAcoAAQ2AgQgCCAHKAAINgIIIAYgBygADDYCDCAIIAcoABA2AhAgBiAHKAAUNgIUIAggBygAGDYCGCAGIAcoABw2AhwgCCAHKAAgNgIgIAYgBygAJDYCJCAIIAcoACg2AiggBiAHKAAsNgIsIAggBygAMDYCMCAGIAcoADQiDDYCNCAPIAcoADgiDjYCOCAGIAcoADwiBzYCPCADIAlqIgkgBjUCACAGNQIUQiCGhDcDACAJIAg1AiggB61CIIaENwMIIAkgCDUCECAGNQIkQiCGhDcDECAJIA6tIAY1AgxCIIaENwMYIAkgCDUCICAMrUIghoQ3AyAgCSAINQIIIAY1AhxCIIaENwMoIAkgCDUCMCAGNQIEQiCGhDcDMCAJIAg1AhggBjUCLEIghoQ3AzggC0EBaiILIApHDQALCyADIAYgASAFECcgBiAGIApBBnQiCGoiByABIAUQJyAHIAhqQUBqKAIAIQYgAkEDTwRAIAJBAXYhD0ECIQwDQCAMIg4gDkF/cyACaiAOIA9JGyIJQQJPBEAgDkEBayENQQEhDCAHIQsDQCAIIAtqIgcgAyALIAMgDCAGIA1xakEBayAKbEEGdGogByABIAUQEiANcSAMaiAKbEEGdGogByAIaiIHIAEgBRASIQYgByELIAxBAmoiDCAJSQ0ACwsgDkEBdCIMIAJJDQALIA5B/v///wdxIQ0LIAcgCGoiCyADIA1Bf3MgAmogByADIAIgDWsgDUEBayICIAZxakECayAKbEEGdGogCyABIAUQEiACcWogCmxBBnRqIAQgASAFEBIaIAoEQCAEIApBBnRqIgUhAkEAIQYDQCAFIAQgBkEGdCIBaiIDKAIANgAAIAUgAygCBDYABCAFIAMoAgg2AAggBSADKAIMNgAMIAUgAygCEDYAECAFIAMoAhQ2ABQgBSADKAIYNgAYIAUgAygCHDYAHCAFIAMoAiA2ACAgBSADKAIkNgAkIAUgAygCKDYAKCAFIAMoAiw2ACwgBSADKAIwNgAwIAUgAygCNDYANCACIAMoAjg2ADggBSADKAI8NgA8IAAgAWoiASAFKQMAPgIAIAEgBTUCND4CBCABIAUpAyg+AgggASAFNQIcPgIMIAEgBSkDED4CECABIAU1AgQ+AhQgASACKQM4PgIYIAEgBTUCLD4CHCABIAUpAyA+AiAgASAFNQIUPgIkIAEgBSkDCD4CKCABIAI1Ajw+AiwgASAFKQMwPgIwIAEgBTUCJD4CNCABIAUpAxg+AjggASAFNQIMPgI8IAZBAWoiBiAKRw0ACwsLmgMCA38BfiMAQdAEayIFJAAgBUGAA2ogACABIAVB4ABqIAUgBUFAaxAhAkAgA0UNACAFIAUpA6ADIgggA61CA4Z8NwOgAyAFIAinQQN2QT9xIgFqQagDaiEAIANBwAAgAWsiAUkEQCAAIAIgAxAFGgwBCyAAIAIgARAFGiAFQYADaiAFQagDaiIGIAVB4ABqIAVB4AJqIgcQCCABIAJqIQAgAyABayIDQcAATwRAA0AgBUGAA2ogACAFQeAAaiAHEAggAEFAayEAIANBQGoiA0E/Sw0ACwsgBiAAIAMQBRoLIAUgBUGAA2ogBUHgAGoQFiAFIAUpA4gEIghCgAJ8NwOIBCAFQegDaiICIAinQQN2QT9xIgFqQShqIQACQCABQR9NBEAgACAFKQMANwAAIAAgBSkDCDcACCAAIAUpAxg3ABggACAFKQMQNwAQDAELIAAgBUHAACABayIAEAUaIAIgBUGQBGoiAyAFQeAAaiAFQeACahAIIAMgACAFaiABQSBrEAUaCyAEIAIgBUHgAGoQFiAFQdAEaiQAC68CAQN/IwBBkANrIgMkACADQYgIKQMANwOwAiADQZAIKQMANwO4AiADQZgIKQMANwPAAiADQgA3A8gCIANBgAgpAwA3A6gCAkAgAUUNACADIAGtQgOGNwPIAiADQdACaiEEIAFBP00EQCAEIAAgARAFGgwBCyAEIAApAAA3AAAgBCAAKQA4NwA4IAQgACkAMDcAMCAEIAApACg3ACggBCAAKQAgNwAgIAQgACkAGDcAGCAEIAApABA3ABAgBCAAKQAINwAIIANBqAJqIAQgAyADQYACaiIFEAggAEFAayEAIAFBQGoiAUHAAE8EQANAIANBqAJqIAAgAyAFEAggAEFAayEAIAFBQGoiAUE/Sw0ACwsgBCAAIAEQBRoLIAIgA0GoAmogAxAWIANBkANqJAALlwMBBX9BECECAkAgAEEQIABBEEsbIgMgA0EBa3FFBEAgAyEADAELA0AgAiIAQQF0IQIgACADSQ0ACwsgAUFAIABrTwRAQbwYQTA2AgBBAA8LQRAgAUELakF4cSABQQtJGyIDIABqQQxqEBwiAkUEQEEADwsgAkEIayEBAkAgAEEBayACcUUEQCABIQAMAQsgAkEEayIFKAIAIgZBeHEgACACakEBa0EAIABrcUEIayICIAAgAmogAiABa0EPSxsiACABayICayEEIAZBA3FFBEAgASgCACEBIAAgBDYCBCAAIAEgAmo2AgAMAQsgACAEIAAoAgRBAXFyQQJyNgIEIAAgBGoiBCAEKAIEQQFyNgIEIAUgAiAFKAIAQQFxckECcjYCACAAIAAoAgRBAXI2AgQgASACECULAkAgACgCBCIBQQNxRQ0AIAFBeHEiAiADQRBqTQ0AIAAgAyABQQFxckECcjYCBCAAIANqIgEgAiADayIDQQNyNgIEIAAgAmoiAiACKAIEQQFyNgIEIAEgAxAlCyAAQQhqCxUAIABBCE0EQCABEBwPCyAAIAEQOAv6DAEHfwJAIABFDQAgAEEIayIDIABBBGsoAgAiAUF4cSIAaiEFAkAgAUEBcQ0AIAFBA3FFDQEgAyADKAIAIgJrIgNBkBkoAgAiBEkNASAAIAJqIQAgA0GUGSgCAEcEQCACQf8BTQRAIAMoAggiBCACQQN2IgJBA3RBqBlqRxogBCADKAIMIgFGBEBBgBlBgBkoAgBBfiACd3E2AgAMAwsgBCABNgIMIAEgBDYCCAwCCyADKAIYIQYCQCADIAMoAgwiAUcEQCADKAIIIgIgBE8EQCACKAIMGgsgAiABNgIMIAEgAjYCCAwBCwJAIANBFGoiAigCACIEDQAgA0EQaiICKAIAIgQNAEEAIQEMAQsDQCACIQcgBCIBQRRqIgIoAgAiBA0AIAFBEGohAiABKAIQIgQNAAsgB0EANgIACyAGRQ0BAkAgAyADKAIcIgJBAnRBsBtqIgQoAgBGBEAgBCABNgIAIAENAUGEGUGEGSgCAEF+IAJ3cTYCAAwDCyAGQRBBFCAGKAIQIANGG2ogATYCACABRQ0CCyABIAY2AhggAygCECICBEAgASACNgIQIAIgATYCGAsgAygCFCICRQ0BIAEgAjYCFCACIAE2AhgMAQsgBSgCBCIBQQNxQQNHDQBBiBkgADYCACAFIAFBfnE2AgQgAyAAQQFyNgIEIAAgA2ogADYCAA8LIAMgBU8NACAFKAIEIgFBAXFFDQACQCABQQJxRQRAIAVBmBkoAgBGBEBBmBkgAzYCAEGMGUGMGSgCACAAaiIANgIAIAMgAEEBcjYCBCADQZQZKAIARw0DQYgZQQA2AgBBlBlBADYCAA8LIAVBlBkoAgBGBEBBlBkgAzYCAEGIGUGIGSgCACAAaiIANgIAIAMgAEEBcjYCBCAAIANqIAA2AgAPCyABQXhxIABqIQACQCABQf8BTQRAIAUoAgwhAiAFKAIIIgQgAUEDdiIBQQN0QagZaiIHRwRAQZAZKAIAGgsgAiAERgRAQYAZQYAZKAIAQX4gAXdxNgIADAILIAIgB0cEQEGQGSgCABoLIAQgAjYCDCACIAQ2AggMAQsgBSgCGCEGAkAgBSAFKAIMIgFHBEAgBSgCCCICQZAZKAIATwRAIAIoAgwaCyACIAE2AgwgASACNgIIDAELAkAgBUEUaiICKAIAIgQNACAFQRBqIgIoAgAiBA0AQQAhAQwBCwNAIAIhByAEIgFBFGoiAigCACIEDQAgAUEQaiECIAEoAhAiBA0ACyAHQQA2AgALIAZFDQACQCAFIAUoAhwiAkECdEGwG2oiBCgCAEYEQCAEIAE2AgAgAQ0BQYQZQYQZKAIAQX4gAndxNgIADAILIAZBEEEUIAYoAhAgBUYbaiABNgIAIAFFDQELIAEgBjYCGCAFKAIQIgIEQCABIAI2AhAgAiABNgIYCyAFKAIUIgJFDQAgASACNgIUIAIgATYCGAsgAyAAQQFyNgIEIAAgA2ogADYCACADQZQZKAIARw0BQYgZIAA2AgAPCyAFIAFBfnE2AgQgAyAAQQFyNgIEIAAgA2ogADYCAAsgAEH/AU0EQCAAQQN2IgFBA3RBqBlqIQACf0GAGSgCACICQQEgAXQiAXFFBEBBgBkgASACcjYCACAADAELIAAoAggLIQIgACADNgIIIAIgAzYCDCADIAA2AgwgAyACNgIIDwtBHyECIANCADcCECAAQf///wdNBEAgAEEIdiIBIAFBgP4/akEQdkEIcSIBdCICIAJBgOAfakEQdkEEcSICdCIEIARBgIAPakEQdkECcSIEdEEPdiABIAJyIARyayIBQQF0IAAgAUEVanZBAXFyQRxqIQILIAMgAjYCHCACQQJ0QbAbaiEBAkACQAJAQYQZKAIAIgRBASACdCIHcUUEQEGEGSAEIAdyNgIAIAEgAzYCACADIAE2AhgMAQsgAEEAQRkgAkEBdmsgAkEfRht0IQIgASgCACEBA0AgASIEKAIEQXhxIABGDQIgAkEddiEBIAJBAXQhAiAEIAFBBHFqIgdBEGooAgAiAQ0ACyAHIAM2AhAgAyAENgIYCyADIAM2AgwgAyADNgIIDAELIAQoAggiACADNgIMIAQgAzYCCCADQQA2AhggAyAENgIMIAMgADYCCAtBoBlBoBkoAgBBAWsiADYCACAADQBByBwhAwNAIAMoAgAiAEEIaiEDIAANAAtBoBlBfzYCAAsLEAAjACAAa0FwcSIAJAAgAAsGACAAJAALBAAjAAuoAQEDfwJAIAEgAigCECIEBH8gBAUgAhA/DQEgAigCEAsgAigCFCIFa0sEQCACIAAgASACKAIkEQMAGg8LAkAgAiwAS0EASA0AIAEhBANAIAQiA0UNASAAIANBAWsiBGotAABBCkcNAAsgAiAAIAMgAigCJBEDACADSQ0BIAAgA2ohACABIANrIQEgAigCFCEFCyAFIAAgARAFGiACIAIoAhQgAWo2AhQLC1kBAX8gACAALQBKIgFBAWsgAXI6AEogACgCACIBQQhxBEAgACABQSByNgIAQX8PCyAAQgA3AgQgACAAKAIsIgE2AhwgACABNgIUIAAgASAAKAIwajYCEEEAC0QCAX8BfiABQv///////z+DIQMCfyABQjCIp0H//wFxIgJB//8BRwRAQQQgAg0BGkECQQMgACADhFAbDwsgACADhFALC9cDAgJ/An4jAEEgayICJAACQCABQv///////////wCDIgVCgICAgICAwIA8fSAFQoCAgICAgMD/wwB9VARAIAFCBIYgAEI8iIQhBSAAQv//////////D4MiAEKBgICAgICAgAhaBEAgBUKBgICAgICAgMAAfCEEDAILIAVCgICAgICAgIBAfSEEIABCgICAgICAgIAIhUIAUg0BIAQgBUIBg3whBAwBCyAAUCAFQoCAgICAgMD//wBUIAVCgICAgICAwP//AFEbRQRAIAFCBIYgAEI8iIRC/////////wODQoCAgICAgID8/wCEIQQMAQtCgICAgICAgPj/ACEEIAVC////////v//DAFYNAEIAIQQgBUIwiKciA0GR9wBJDQAgAkEQaiAAIAFC////////P4NCgICAgICAwACEIgQgA0GB9wBrEAkgAiAAIARBgfgAIANrEBkgAikDCEIEhiACKQMAIgBCPIiEIQQgAikDECACKQMYhEIAUq0gAEL//////////w+DhCIAQoGAgICAgICACFoEQCAEQgF8IQQMAQsgAEKAgICAgICAgAiFQgBSDQAgBEIBgyAEfCEECyACQSBqJAAgBCABQoCAgICAgICAgH+DhL8LxgECA38CfiMAQRBrIgMkAAJ+IAG8IgRB/////wdxIgJBgICABGtB////9wdNBEAgAq1CGYZCgICAgICAgMA/fAwBCyACQYCAgPwHTwRAIAStQhmGQoCAgICAgMD//wCEDAELIAJFBEBCAAwBCyADIAKtQgAgAmciAkHRAGoQCSADKQMAIQUgAykDCEKAgICAgIDAAIVBif8AIAJrrUIwhoQLIQYgACAFNwMAIAAgBiAEQYCAgIB4ca1CIIaENwMIIANBEGokAAssAEHAFi0AAEUEQEHMFkIANwIAQcQWQgA3AgBBwBZBAToAAAsgACABIAIQWwssAgF/AXwjAEEQayIBJAAgASAAEEUgASkDACABKQMIEEEhAiABQRBqJAAgAguFAQIB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gAghBwsgACgCaARAIAAgACgCBEEBazYCBAsCQCAHQoCAgIAIVA0AIANFBEBBvBhBxAA2AgBC/////wchCAwCCyAHQoCAgIAIWA0AQbwYQcQANgIADAELIAcgA6wiCIUgCH0hCAsgBkEQaiQAIAgLQAECfyMAQRBrIgEkAEF/IQICQCAAEEwNACAAIAFBD2pBASAAKAIgEQMAQQFHDQAgAS0ADyECCyABQRBqJAAgAgt8AQJ/IAAgAC0ASiIBQQFrIAFyOgBKIAAoAhQgACgCHEsEQCAAQQBBACAAKAIkEQMAGgsgAEEANgIcIABCADcDECAAKAIAIgFBBHEEQCAAIAFBIHI2AgBBfw8LIAAgACgCLCAAKAIwaiICNgIIIAAgAjYCBCABQRt0QR91C4MBAgN/AX4CQCAAQoCAgIAQVARAIAAhBQwBCwNAIAFBAWsiASAAIABCCoAiBUIKfn2nQTByOgAAIABC/////58BViECIAUhACACDQALCyAFpyICBEADQCABQQFrIgEgAiACQQpuIgNBCmxrQTByOgAAIAJBCUshBCADIQIgBA0ACwsgAQstACAAUEUEQANAIAFBAWsiASAAp0EHcUEwcjoAACAAQgOIIgBCAFINAAsLIAELNAAgAFBFBEADQCABQQFrIgEgAKdBD3FB4BFqLQAAIAJyOgAAIABCBIgiAEIAUg0ACwsgAQvBAgEDfyMAQdABayICJAAgAiABNgLMAUEAIQEgAkGgAWpBAEEoEBgaIAIgAigCzAE2AsgBAkBBACACQcgBaiACQdAAaiACQaABahAfQQBIDQAgACgCTEEATiEBIAAoAgAhAyAALABKQQBMBEAgACADQV9xNgIACyADQSBxIQQCfyAAKAIwBEAgACACQcgBaiACQdAAaiACQaABahAfDAELIABB0AA2AjAgACACQdAAajYCECAAIAI2AhwgACACNgIUIAAoAiwhAyAAIAI2AiwgACACQcgBaiACQdAAaiACQaABahAfIANFDQAaIABBAEEAIAAoAiQRAwAaIABBADYCMCAAIAM2AiwgAEEANgIcIABBADYCECAAKAIUGiAAQQA2AhRBAAsaIAAgACgCACAEcjYCACABRQ0ACyACQdABaiQAC4kCAAJAIAAEfyABQf8ATQ0BAkBBhBYoAgAoAgBFBEAgAUGAf3FBgL8DRg0DDAELIAFB/w9NBEAgACABQT9xQYABcjoAASAAIAFBBnZBwAFyOgAAQQIPCyABQYCwA09BACABQYBAcUGAwANHG0UEQCAAIAFBP3FBgAFyOgACIAAgAUEMdkHgAXI6AAAgACABQQZ2QT9xQYABcjoAAUEDDwsgAUGAgARrQf//P00EQCAAIAFBP3FBgAFyOgADIAAgAUESdkHwAXI6AAAgACABQQZ2QT9xQYABcjoAAiAAIAFBDHZBP3FBgAFyOgABQQQPCwtBvBhBGTYCAEF/BUEBCw8LIAAgAToAAEEBC7oBAQF/IAFBAEchAgJAAkACQCABRQ0AIABBA3FFDQADQCAALQAARQ0CIABBAWohACABQQFrIgFBAEchAiABRQ0BIABBA3ENAAsLIAJFDQELAkAgAC0AAEUNACABQQRJDQADQCAAKAIAIgJBf3MgAkGBgoQIa3FBgIGChHhxDQEgAEEEaiEAIAFBBGsiAUEDSw0ACwsgAUUNAANAIAAtAABFBEAgAA8LIABBAWohACABQQFrIgENAAsLQQALIQEBfyMAQRBrIgIkACACIAE2AgwgACABEFQgAkEQaiQAC4YBAQJ/IwBBoAFrIgIkACACQQhqQegMQZABEAUaIAIgADYCNCACIAA2AhwgAkF+IABrIgNB/////wcgA0H/////B0kbIgM2AjggAiAAIANqIgA2AiQgAiAANgIYIAJBCGogARBQIAMEQCACKAIcIgAgACACKAIYRmtBADoAAAsgAkGgAWokAAszAQF/IAAoAhQiAyABIAIgACgCECADayIBIAEgAksbIgEQBRogACAAKAIUIAFqNgIUIAILQAAgAEH/////B08EQEG8GEEwNgIAQX8PC0EAIABBA0EiQX9BABACIgBBgWBPBH9BvBhBACAAazYCAEF/BSAACwvnBgECfyMAIgMhBCADQYADa0GAf3EiAyQAIANBADYCXCADQeAMKAIANgJYIANB2AwpAgA3A1AgA0HQDCkCADcDSCADQbACaiAAQdAAEBUgA0GQAmogARBERAAAAAAAAPA+ohBYIAMgAykD6AI3A7gBIAMgAygC8AI2AsABIAMgAykD4AI3A7ABIAMgAykD2AI3A6gBIAMgAygC1AI2AqQBIAMgAygCsAIiAEEYdCAAQQh0QYCA/AdxciAAQQh2QYD+A3EgAEEYdnJy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mw8LAQwAQacPCxUMAAAAAAwAAAAACQwAAAAAAAwAAAwAQdUPCwEOAEHhDwsVDQAAAAQNAAAAAAkOAAAAAAAOAAAOAEGPEAsBEABBmxALHg8AAAAADwAAAAAJEAAAAAAAEAAAEAAAEgAAABISEgBB0hALDhIAAAASEhIAAAAAAAAJAEGDEQsBCwBBjxELFQoAAAAACgAAAAAJCwAAAAAACwAACwBBvRELAQwAQckRC70CDAAAAAAMAAAAAAkMAAAAAAAMAAAMAAAwMTIzNDU2Nzg5QUJDREVG/////////////////////////////////////////////////////////////////wABAgMEBQYHCAn/////////CgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiP///////8KCwwNDg8QERITFBUWFxgZGhscHR4fICEiI/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AAQIEBwMGBQBpbmZpbml0eQBuYW4AQZAUC0jRdJ4AV529KoBwUg///z4nCgAAAGQAAADoAwAAECcAAKCGAQBAQg8AgJaYAADh9QUYAAAANQAAAHEAAABr////zvv//5K///8AQYQWCwJoDABBvBYLA3AOUA=="

function getBinary() {
    try {
        if (wasmBinary) {
            return new Uint8Array(wasmBinary)
        }
        if (readBinary) {
            return readBinary(wasmBinaryFile)
        } else {
            throw "both async and sync fetching of the wasm failed"
        }
    } catch (err) {
        abort(err)
    }
}

function getBinaryPromise() {
    if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === "function" && !isFileURI(wasmBinaryFile)) {
      var binary = Uint8Array.from(atob(wasmBase64), c => c.charCodeAt(0));
      return Promise.resolve(binary);
    }
    return Promise.resolve().then(getBinary)
}

function createWasm() {
    var info = {
        "a": asmLibraryArg
    };

    function receiveInstance(instance, module) {
        var exports = instance.exports;
        Module["asm"] = exports;
        wasmMemory = Module["asm"]["f"];
        updateGlobalBufferAndViews(wasmMemory.buffer);
        wasmTable = Module["asm"]["g"];
        removeRunDependency("wasm-instantiate")
    }
    addRunDependency("wasm-instantiate");

    function receiveInstantiatedSource(output) {
        receiveInstance(output["instance"])
    }

    function instantiateArrayBuffer(receiver) {
        return getBinaryPromise().then(function(binary) {
            return WebAssembly.instantiate(binary, info)
        }).then(receiver, function(reason) {
            err("failed to asynchronously prepare wasm: " + reason);
            abort(reason)
        })
    }

    function instantiateAsync() {
        if (!wasmBinary && typeof WebAssembly.instantiateStreaming === "function" && !isDataURI(wasmBinaryFile) && !isFileURI(wasmBinaryFile) && typeof fetch === "function") {
          var binary = Uint8Array.from(atob(wasmBase64), c => c.charCodeAt(0));
          return WebAssembly.instantiate(binary, info)
            .then(receiveInstantiatedSource)
            .catch(function(reason) {
                err("wasm instantiation failed: " + reason);
            });
        } else {
            return instantiateArrayBuffer(receiveInstantiatedSource)
        }
    }
    if (Module["instantiateWasm"]) {
        try {
            var exports = Module["instantiateWasm"](info, receiveInstance);
            return exports
        } catch (e) {
            err("Module.instantiateWasm callback failed with error: " + e);
            return false
        }
    }
    instantiateAsync();
    return {}
}
var tempDouble;
var tempI64;

function callRuntimeCallbacks(callbacks) {
    while (callbacks.length > 0) {
        var callback = callbacks.shift();
        if (typeof callback == "function") {
            callback(Module);
            continue
        }
        var func = callback.func;
        if (typeof func === "number") {
            if (callback.arg === undefined) {
                wasmTable.get(func)()
            } else {
                wasmTable.get(func)(callback.arg)
            }
        } else {
            func(callback.arg === undefined ? null : callback.arg)
        }
    }
}

function ___assert_fail(condition, filename, line, func) {
    abort("Assertion failed: " + UTF8ToString(condition) + ", at: " + [filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function"])
}
var PATH = {
    splitPath: function(filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1)
    },
    normalizeArray: function(parts, allowAboveRoot) {
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
            var last = parts[i];
            if (last === ".") {
                parts.splice(i, 1)
            } else if (last === "..") {
                parts.splice(i, 1);
                up++
            } else if (up) {
                parts.splice(i, 1);
                up--
            }
        }
        if (allowAboveRoot) {
            for (; up; up--) {
                parts.unshift("..")
            }
        }
        return parts
    },
    normalize: function(path) {
        var isAbsolute = path.charAt(0) === "/",
            trailingSlash = path.substr(-1) === "/";
        path = PATH.normalizeArray(path.split("/").filter(function(p) {
            return !!p
        }), !isAbsolute).join("/");
        if (!path && !isAbsolute) {
            path = "."
        }
        if (path && trailingSlash) {
            path += "/"
        }
        return (isAbsolute ? "/" : "") + path
    },
    dirname: function(path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
            return "."
        }
        if (dir) {
            dir = dir.substr(0, dir.length - 1)
        }
        return root + dir
    },
    basename: function(path) {
        if (path === "/") return "/";
        path = PATH.normalize(path);
        path = path.replace(/\/$/, "");
        var lastSlash = path.lastIndexOf("/");
        if (lastSlash === -1) return path;
        return path.substr(lastSlash + 1)
    },
    extname: function(path) {
        return PATH.splitPath(path)[3]
    },
    join: function() {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join("/"))
    },
    join2: function(l, r) {
        return PATH.normalize(l + "/" + r)
    }
};

function getRandomDevice() {
    if (typeof crypto === "object" && typeof crypto["getRandomValues"] === "function") {
        var randomBuffer = new Uint8Array(1);
        return function() {
            crypto.getRandomValues(randomBuffer);
            return randomBuffer[0]
        }
    } else if (ENVIRONMENT_IS_NODE) {
        try {
            var crypto_module = require("crypto");
            return function() {
                return crypto_module["randomBytes"](1)[0]
            }
        } catch (e) {}
    }
    return function() {
        abort("randomDevice")
    }
}
var PATH_FS = {
    resolve: function() {
        var resolvedPath = "",
            resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
            var path = i >= 0 ? arguments[i] : FS.cwd();
            if (typeof path !== "string") {
                throw new TypeError("Arguments to path.resolve must be strings")
            } else if (!path) {
                return ""
            }
            resolvedPath = path + "/" + resolvedPath;
            resolvedAbsolute = path.charAt(0) === "/"
        }
        resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter(function(p) {
            return !!p
        }), !resolvedAbsolute).join("/");
        return (resolvedAbsolute ? "/" : "") + resolvedPath || "."
    },
    relative: function(from, to) {
        from = PATH_FS.resolve(from).substr(1);
        to = PATH_FS.resolve(to).substr(1);

        function trim(arr) {
            var start = 0;
            for (; start < arr.length; start++) {
                if (arr[start] !== "") break
            }
            var end = arr.length - 1;
            for (; end >= 0; end--) {
                if (arr[end] !== "") break
            }
            if (start > end) return [];
            return arr.slice(start, end - start + 1)
        }
        var fromParts = trim(from.split("/"));
        var toParts = trim(to.split("/"));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
            if (fromParts[i] !== toParts[i]) {
                samePartsLength = i;
                break
            }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
            outputParts.push("..")
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join("/")
    }
};
var TTY = {
    ttys: [],
    init: function() {},
    shutdown: function() {},
    register: function(dev, ops) {
        TTY.ttys[dev] = {
            input: [],
            output: [],
            ops: ops
        };
        FS.registerDevice(dev, TTY.stream_ops)
    },
    stream_ops: {
        open: function(stream) {
            var tty = TTY.ttys[stream.node.rdev];
            if (!tty) {
                throw new FS.ErrnoError(43)
            }
            stream.tty = tty;
            stream.seekable = false
        },
        close: function(stream) {
            stream.tty.ops.flush(stream.tty)
        },
        flush: function(stream) {
            stream.tty.ops.flush(stream.tty)
        },
        read: function(stream, buffer, offset, length, pos) {
            if (!stream.tty || !stream.tty.ops.get_char) {
                throw new FS.ErrnoError(60)
            }
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
                var result;
                try {
                    result = stream.tty.ops.get_char(stream.tty)
                } catch (e) {
                    throw new FS.ErrnoError(29)
                }
                if (result === undefined && bytesRead === 0) {
                    throw new FS.ErrnoError(6)
                }
                if (result === null || result === undefined) break;
                bytesRead++;
                buffer[offset + i] = result
            }
            if (bytesRead) {
                stream.node.timestamp = Date.now()
            }
            return bytesRead
        },
        write: function(stream, buffer, offset, length, pos) {
            if (!stream.tty || !stream.tty.ops.put_char) {
                throw new FS.ErrnoError(60)
            }
            try {
                for (var i = 0; i < length; i++) {
                    stream.tty.ops.put_char(stream.tty, buffer[offset + i])
                }
            } catch (e) {
                throw new FS.ErrnoError(29)
            }
            if (length) {
                stream.node.timestamp = Date.now()
            }
            return i
        }
    },
    default_tty_ops: {
        get_char: function(tty) {
            if (!tty.input.length) {
                var result = null;
                if (ENVIRONMENT_IS_NODE) {
                    var BUFSIZE = 256;
                    var buf = Buffer.alloc ? Buffer.alloc(BUFSIZE) : new Buffer(BUFSIZE);
                    var bytesRead = 0;
                    try {
                        bytesRead = nodeFS.readSync(process.stdin.fd, buf, 0, BUFSIZE, null)
                    } catch (e) {
                        if (e.toString().indexOf("EOF") != -1) bytesRead = 0;
                        else throw e
                    }
                    if (bytesRead > 0) {
                        result = buf.slice(0, bytesRead).toString("utf-8")
                    } else {
                        result = null
                    }
                } else if (typeof window != "undefined" && typeof window.prompt == "function") {
                    result = window.prompt("Input: ");
                    if (result !== null) {
                        result += "\n"
                    }
                } else if (typeof readline == "function") {
                    result = readline();
                    if (result !== null) {
                        result += "\n"
                    }
                }
                if (!result) {
                    return null
                }
                tty.input = intArrayFromString(result, true)
            }
            return tty.input.shift()
        },
        put_char: function(tty, val) {
            if (val === null || val === 10) {
                out(UTF8ArrayToString(tty.output, 0));
                tty.output = []
            } else {
                if (val != 0) tty.output.push(val)
            }
        },
        flush: function(tty) {
            if (tty.output && tty.output.length > 0) {
                out(UTF8ArrayToString(tty.output, 0));
                tty.output = []
            }
        }
    },
    default_tty1_ops: {
        put_char: function(tty, val) {
            if (val === null || val === 10) {
                err(UTF8ArrayToString(tty.output, 0));
                tty.output = []
            } else {
                if (val != 0) tty.output.push(val)
            }
        },
        flush: function(tty) {
            if (tty.output && tty.output.length > 0) {
                err(UTF8ArrayToString(tty.output, 0));
                tty.output = []
            }
        }
    }
};

function mmapAlloc(size) {
    var alignedSize = alignMemory(size, 16384);
    var ptr = _malloc(alignedSize);
    while (size < alignedSize) HEAP8[ptr + size++] = 0;
    return ptr
}
var MEMFS = {
    ops_table: null,
    mount: function(mount) {
        return MEMFS.createNode(null, "/", 16384 | 511, 0)
    },
    createNode: function(parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
            throw new FS.ErrnoError(63)
        }
        if (!MEMFS.ops_table) {
            MEMFS.ops_table = {
                dir: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr,
                        lookup: MEMFS.node_ops.lookup,
                        mknod: MEMFS.node_ops.mknod,
                        rename: MEMFS.node_ops.rename,
                        unlink: MEMFS.node_ops.unlink,
                        rmdir: MEMFS.node_ops.rmdir,
                        readdir: MEMFS.node_ops.readdir,
                        symlink: MEMFS.node_ops.symlink
                    },
                    stream: {
                        llseek: MEMFS.stream_ops.llseek
                    }
                },
                file: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr
                    },
                    stream: {
                        llseek: MEMFS.stream_ops.llseek,
                        read: MEMFS.stream_ops.read,
                        write: MEMFS.stream_ops.write,
                        allocate: MEMFS.stream_ops.allocate,
                        mmap: MEMFS.stream_ops.mmap,
                        msync: MEMFS.stream_ops.msync
                    }
                },
                link: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr,
                        readlink: MEMFS.node_ops.readlink
                    },
                    stream: {}
                },
                chrdev: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr
                    },
                    stream: FS.chrdev_stream_ops
                }
            }
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
            node.node_ops = MEMFS.ops_table.dir.node;
            node.stream_ops = MEMFS.ops_table.dir.stream;
            node.contents = {}
        } else if (FS.isFile(node.mode)) {
            node.node_ops = MEMFS.ops_table.file.node;
            node.stream_ops = MEMFS.ops_table.file.stream;
            node.usedBytes = 0;
            node.contents = null
        } else if (FS.isLink(node.mode)) {
            node.node_ops = MEMFS.ops_table.link.node;
            node.stream_ops = MEMFS.ops_table.link.stream
        } else if (FS.isChrdev(node.mode)) {
            node.node_ops = MEMFS.ops_table.chrdev.node;
            node.stream_ops = MEMFS.ops_table.chrdev.stream
        }
        node.timestamp = Date.now();
        if (parent) {
            parent.contents[name] = node
        }
        return node
    },
    getFileDataAsRegularArray: function(node) {
        if (node.contents && node.contents.subarray) {
            var arr = [];
            for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
            return arr
        }
        return node.contents
    },
    getFileDataAsTypedArray: function(node) {
        if (!node.contents) return new Uint8Array(0);
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
        return new Uint8Array(node.contents)
    },
    expandFileStorage: function(node, newCapacity) {
        var prevCapacity = node.contents ? node.contents.length : 0;
        if (prevCapacity >= newCapacity) return;
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
        if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
        var oldContents = node.contents;
        node.contents = new Uint8Array(newCapacity);
        if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
        return
    },
    resizeFileStorage: function(node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
            node.contents = null;
            node.usedBytes = 0;
            return
        }
        if (!node.contents || node.contents.subarray) {
            var oldContents = node.contents;
            node.contents = new Uint8Array(newSize);
            if (oldContents) {
                node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)))
            }
            node.usedBytes = newSize;
            return
        }
        if (!node.contents) node.contents = [];
        if (node.contents.length > newSize) node.contents.length = newSize;
        else
            while (node.contents.length < newSize) node.contents.push(0);
        node.usedBytes = newSize
    },
    node_ops: {
        getattr: function(node) {
            var attr = {};
            attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
            attr.ino = node.id;
            attr.mode = node.mode;
            attr.nlink = 1;
            attr.uid = 0;
            attr.gid = 0;
            attr.rdev = node.rdev;
            if (FS.isDir(node.mode)) {
                attr.size = 4096
            } else if (FS.isFile(node.mode)) {
                attr.size = node.usedBytes
            } else if (FS.isLink(node.mode)) {
                attr.size = node.link.length
            } else {
                attr.size = 0
            }
            attr.atime = new Date(node.timestamp);
            attr.mtime = new Date(node.timestamp);
            attr.ctime = new Date(node.timestamp);
            attr.blksize = 4096;
            attr.blocks = Math.ceil(attr.size / attr.blksize);
            return attr
        },
        setattr: function(node, attr) {
            if (attr.mode !== undefined) {
                node.mode = attr.mode
            }
            if (attr.timestamp !== undefined) {
                node.timestamp = attr.timestamp
            }
            if (attr.size !== undefined) {
                MEMFS.resizeFileStorage(node, attr.size)
            }
        },
        lookup: function(parent, name) {
            throw FS.genericErrors[44]
        },
        mknod: function(parent, name, mode, dev) {
            return MEMFS.createNode(parent, name, mode, dev)
        },
        rename: function(old_node, new_dir, new_name) {
            if (FS.isDir(old_node.mode)) {
                var new_node;
                try {
                    new_node = FS.lookupNode(new_dir, new_name)
                } catch (e) {}
                if (new_node) {
                    for (var i in new_node.contents) {
                        throw new FS.ErrnoError(55)
                    }
                }
            }
            delete old_node.parent.contents[old_node.name];
            old_node.name = new_name;
            new_dir.contents[new_name] = old_node;
            old_node.parent = new_dir
        },
        unlink: function(parent, name) {
            delete parent.contents[name]
        },
        rmdir: function(parent, name) {
            var node = FS.lookupNode(parent, name);
            for (var i in node.contents) {
                throw new FS.ErrnoError(55)
            }
            delete parent.contents[name]
        },
        readdir: function(node) {
            var entries = [".", ".."];
            for (var key in node.contents) {
                if (!node.contents.hasOwnProperty(key)) {
                    continue
                }
                entries.push(key)
            }
            return entries
        },
        symlink: function(parent, newname, oldpath) {
            var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
            node.link = oldpath;
            return node
        },
        readlink: function(node) {
            if (!FS.isLink(node.mode)) {
                throw new FS.ErrnoError(28)
            }
            return node.link
        }
    },
    stream_ops: {
        read: function(stream, buffer, offset, length, position) {
            var contents = stream.node.contents;
            if (position >= stream.node.usedBytes) return 0;
            var size = Math.min(stream.node.usedBytes - position, length);
            if (size > 8 && contents.subarray) {
                buffer.set(contents.subarray(position, position + size), offset)
            } else {
                for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i]
            }
            return size
        },
        write: function(stream, buffer, offset, length, position, canOwn) {
            if (!length) return 0;
            var node = stream.node;
            node.timestamp = Date.now();
            if (buffer.subarray && (!node.contents || node.contents.subarray)) {
                if (canOwn) {
                    node.contents = buffer.subarray(offset, offset + length);
                    node.usedBytes = length;
                    return length
                } else if (node.usedBytes === 0 && position === 0) {
                    node.contents = buffer.slice(offset, offset + length);
                    node.usedBytes = length;
                    return length
                } else if (position + length <= node.usedBytes) {
                    node.contents.set(buffer.subarray(offset, offset + length), position);
                    return length
                }
            }
            MEMFS.expandFileStorage(node, position + length);
            if (node.contents.subarray && buffer.subarray) {
                node.contents.set(buffer.subarray(offset, offset + length), position)
            } else {
                for (var i = 0; i < length; i++) {
                    node.contents[position + i] = buffer[offset + i]
                }
            }
            node.usedBytes = Math.max(node.usedBytes, position + length);
            return length
        },
        llseek: function(stream, offset, whence) {
            var position = offset;
            if (whence === 1) {
                position += stream.position
            } else if (whence === 2) {
                if (FS.isFile(stream.node.mode)) {
                    position += stream.node.usedBytes
                }
            }
            if (position < 0) {
                throw new FS.ErrnoError(28)
            }
            return position
        },
        allocate: function(stream, offset, length) {
            MEMFS.expandFileStorage(stream.node, offset + length);
            stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length)
        },
        mmap: function(stream, address, length, position, prot, flags) {
            assert(address === 0);
            if (!FS.isFile(stream.node.mode)) {
                throw new FS.ErrnoError(43)
            }
            var ptr;
            var allocated;
            var contents = stream.node.contents;
            if (!(flags & 2) && contents.buffer === buffer) {
                allocated = false;
                ptr = contents.byteOffset
            } else {
                if (position > 0 || position + length < contents.length) {
                    if (contents.subarray) {
                        contents = contents.subarray(position, position + length)
                    } else {
                        contents = Array.prototype.slice.call(contents, position, position + length)
                    }
                }
                allocated = true;
                ptr = mmapAlloc(length);
                if (!ptr) {
                    throw new FS.ErrnoError(48)
                }
                HEAP8.set(contents, ptr)
            }
            return {
                ptr: ptr,
                allocated: allocated
            }
        },
        msync: function(stream, buffer, offset, length, mmapFlags) {
            if (!FS.isFile(stream.node.mode)) {
                throw new FS.ErrnoError(43)
            }
            if (mmapFlags & 2) {
                return 0
            }
            var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
            return 0
        }
    }
};
var FS = {
    root: null,
    mounts: [],
    devices: {},
    streams: [],
    nextInode: 1,
    nameTable: null,
    currentPath: "/",
    initialized: false,
    ignorePermissions: true,
    trackingDelegate: {},
    tracking: {
        openFlags: {
            READ: 1,
            WRITE: 2
        }
    },
    ErrnoError: null,
    genericErrors: {},
    filesystems: null,
    syncFSRequests: 0,
    lookupPath: function(path, opts) {
        path = PATH_FS.resolve(FS.cwd(), path);
        opts = opts || {};
        if (!path) return {
            path: "",
            node: null
        };
        var defaults = {
            follow_mount: true,
            recurse_count: 0
        };
        for (var key in defaults) {
            if (opts[key] === undefined) {
                opts[key] = defaults[key]
            }
        }
        if (opts.recurse_count > 8) {
            throw new FS.ErrnoError(32)
        }
        var parts = PATH.normalizeArray(path.split("/").filter(function(p) {
            return !!p
        }), false);
        var current = FS.root;
        var current_path = "/";
        for (var i = 0; i < parts.length; i++) {
            var islast = i === parts.length - 1;
            if (islast && opts.parent) {
                break
            }
            current = FS.lookupNode(current, parts[i]);
            current_path = PATH.join2(current_path, parts[i]);
            if (FS.isMountpoint(current)) {
                if (!islast || islast && opts.follow_mount) {
                    current = current.mounted.root
                }
            }
            if (!islast || opts.follow) {
                var count = 0;
                while (FS.isLink(current.mode)) {
                    var link = FS.readlink(current_path);
                    current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
                    var lookup = FS.lookupPath(current_path, {
                        recurse_count: opts.recurse_count
                    });
                    current = lookup.node;
                    if (count++ > 40) {
                        throw new FS.ErrnoError(32)
                    }
                }
            }
        }
        return {
            path: current_path,
            node: current
        }
    },
    getPath: function(node) {
        var path;
        while (true) {
            if (FS.isRoot(node)) {
                var mount = node.mount.mountpoint;
                if (!path) return mount;
                return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path
            }
            path = path ? node.name + "/" + path : node.name;
            node = node.parent
        }
    },
    hashName: function(parentid, name) {
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
            hash = (hash << 5) - hash + name.charCodeAt(i) | 0
        }
        return (parentid + hash >>> 0) % FS.nameTable.length
    },
    hashAddNode: function(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node
    },
    hashRemoveNode: function(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
            FS.nameTable[hash] = node.name_next
        } else {
            var current = FS.nameTable[hash];
            while (current) {
                if (current.name_next === node) {
                    current.name_next = node.name_next;
                    break
                }
                current = current.name_next
            }
        }
    },
    lookupNode: function(parent, name) {
        var errCode = FS.mayLookup(parent);
        if (errCode) {
            throw new FS.ErrnoError(errCode, parent)
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
            var nodeName = node.name;
            if (node.parent.id === parent.id && nodeName === name) {
                return node
            }
        }
        return FS.lookup(parent, name)
    },
    createNode: function(parent, name, mode, rdev) {
        var node = new FS.FSNode(parent, name, mode, rdev);
        FS.hashAddNode(node);
        return node
    },
    destroyNode: function(node) {
        FS.hashRemoveNode(node)
    },
    isRoot: function(node) {
        return node === node.parent
    },
    isMountpoint: function(node) {
        return !!node.mounted
    },
    isFile: function(mode) {
        return (mode & 61440) === 32768
    },
    isDir: function(mode) {
        return (mode & 61440) === 16384
    },
    isLink: function(mode) {
        return (mode & 61440) === 40960
    },
    isChrdev: function(mode) {
        return (mode & 61440) === 8192
    },
    isBlkdev: function(mode) {
        return (mode & 61440) === 24576
    },
    isFIFO: function(mode) {
        return (mode & 61440) === 4096
    },
    isSocket: function(mode) {
        return (mode & 49152) === 49152
    },
    flagModes: {
        "r": 0,
        "r+": 2,
        "w": 577,
        "w+": 578,
        "a": 1089,
        "a+": 1090
    },
    modeStringToFlags: function(str) {
        var flags = FS.flagModes[str];
        if (typeof flags === "undefined") {
            throw new Error("Unknown file open mode: " + str)
        }
        return flags
    },
    flagsToPermissionString: function(flag) {
        var perms = ["r", "w", "rw"][flag & 3];
        if (flag & 512) {
            perms += "w"
        }
        return perms
    },
    nodePermissions: function(node, perms) {
        if (FS.ignorePermissions) {
            return 0
        }
        if (perms.indexOf("r") !== -1 && !(node.mode & 292)) {
            return 2
        } else if (perms.indexOf("w") !== -1 && !(node.mode & 146)) {
            return 2
        } else if (perms.indexOf("x") !== -1 && !(node.mode & 73)) {
            return 2
        }
        return 0
    },
    mayLookup: function(dir) {
        var errCode = FS.nodePermissions(dir, "x");
        if (errCode) return errCode;
        if (!dir.node_ops.lookup) return 2;
        return 0
    },
    mayCreate: function(dir, name) {
        try {
            var node = FS.lookupNode(dir, name);
            return 20
        } catch (e) {}
        return FS.nodePermissions(dir, "wx")
    },
    mayDelete: function(dir, name, isdir) {
        var node;
        try {
            node = FS.lookupNode(dir, name)
        } catch (e) {
            return e.errno
        }
        var errCode = FS.nodePermissions(dir, "wx");
        if (errCode) {
            return errCode
        }
        if (isdir) {
            if (!FS.isDir(node.mode)) {
                return 54
            }
            if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
                return 10
            }
        } else {
            if (FS.isDir(node.mode)) {
                return 31
            }
        }
        return 0
    },
    mayOpen: function(node, flags) {
        if (!node) {
            return 44
        }
        if (FS.isLink(node.mode)) {
            return 32
        } else if (FS.isDir(node.mode)) {
            if (FS.flagsToPermissionString(flags) !== "r" || flags & 512) {
                return 31
            }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags))
    },
    MAX_OPEN_FDS: 4096,
    nextfd: function(fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
            if (!FS.streams[fd]) {
                return fd
            }
        }
        throw new FS.ErrnoError(33)
    },
    getStream: function(fd) {
        return FS.streams[fd]
    },
    createStream: function(stream, fd_start, fd_end) {
        if (!FS.FSStream) {
            FS.FSStream = function() {};
            FS.FSStream.prototype = {
                object: {
                    get: function() {
                        return this.node
                    },
                    set: function(val) {
                        this.node = val
                    }
                },
                isRead: {
                    get: function() {
                        return (this.flags & 2097155) !== 1
                    }
                },
                isWrite: {
                    get: function() {
                        return (this.flags & 2097155) !== 0
                    }
                },
                isAppend: {
                    get: function() {
                        return this.flags & 1024
                    }
                }
            }
        }
        var newStream = new FS.FSStream;
        for (var p in stream) {
            newStream[p] = stream[p]
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream
    },
    closeStream: function(fd) {
        FS.streams[fd] = null
    },
    chrdev_stream_ops: {
        open: function(stream) {
            var device = FS.getDevice(stream.node.rdev);
            stream.stream_ops = device.stream_ops;
            if (stream.stream_ops.open) {
                stream.stream_ops.open(stream)
            }
        },
        llseek: function() {
            throw new FS.ErrnoError(70)
        }
    },
    major: function(dev) {
        return dev >> 8
    },
    minor: function(dev) {
        return dev & 255
    },
    makedev: function(ma, mi) {
        return ma << 8 | mi
    },
    registerDevice: function(dev, ops) {
        FS.devices[dev] = {
            stream_ops: ops
        }
    },
    getDevice: function(dev) {
        return FS.devices[dev]
    },
    getMounts: function(mount) {
        var mounts = [];
        var check = [mount];
        while (check.length) {
            var m = check.pop();
            mounts.push(m);
            check.push.apply(check, m.mounts)
        }
        return mounts
    },
    syncfs: function(populate, callback) {
        if (typeof populate === "function") {
            callback = populate;
            populate = false
        }
        FS.syncFSRequests++;
        if (FS.syncFSRequests > 1) {
            err("warning: " + FS.syncFSRequests + " FS.syncfs operations in flight at once, probably just doing extra work")
        }
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;

        function doCallback(errCode) {
            FS.syncFSRequests--;
            return callback(errCode)
        }

        function done(errCode) {
            if (errCode) {
                if (!done.errored) {
                    done.errored = true;
                    return doCallback(errCode)
                }
                return
            }
            if (++completed >= mounts.length) {
                doCallback(null)
            }
        }
        mounts.forEach(function(mount) {
            if (!mount.type.syncfs) {
                return done(null)
            }
            mount.type.syncfs(mount, populate, done)
        })
    },
    mount: function(type, opts, mountpoint) {
        var root = mountpoint === "/";
        var pseudo = !mountpoint;
        var node;
        if (root && FS.root) {
            throw new FS.ErrnoError(10)
        } else if (!root && !pseudo) {
            var lookup = FS.lookupPath(mountpoint, {
                follow_mount: false
            });
            mountpoint = lookup.path;
            node = lookup.node;
            if (FS.isMountpoint(node)) {
                throw new FS.ErrnoError(10)
            }
            if (!FS.isDir(node.mode)) {
                throw new FS.ErrnoError(54)
            }
        }
        var mount = {
            type: type,
            opts: opts,
            mountpoint: mountpoint,
            mounts: []
        };
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
        if (root) {
            FS.root = mountRoot
        } else if (node) {
            node.mounted = mount;
            if (node.mount) {
                node.mount.mounts.push(mount)
            }
        }
        return mountRoot
    },
    unmount: function(mountpoint) {
        var lookup = FS.lookupPath(mountpoint, {
            follow_mount: false
        });
        if (!FS.isMountpoint(lookup.node)) {
            throw new FS.ErrnoError(28)
        }
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
        Object.keys(FS.nameTable).forEach(function(hash) {
            var current = FS.nameTable[hash];
            while (current) {
                var next = current.name_next;
                if (mounts.indexOf(current.mount) !== -1) {
                    FS.destroyNode(current)
                }
                current = next
            }
        });
        node.mounted = null;
        var idx = node.mount.mounts.indexOf(mount);
        node.mount.mounts.splice(idx, 1)
    },
    lookup: function(parent, name) {
        return parent.node_ops.lookup(parent, name)
    },
    mknod: function(path, mode, dev) {
        var lookup = FS.lookupPath(path, {
            parent: true
        });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === "." || name === "..") {
            throw new FS.ErrnoError(28)
        }
        var errCode = FS.mayCreate(parent, name);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.mknod) {
            throw new FS.ErrnoError(63)
        }
        return parent.node_ops.mknod(parent, name, mode, dev)
    },
    create: function(path, mode) {
        mode = mode !== undefined ? mode : 438;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0)
    },
    mkdir: function(path, mode) {
        mode = mode !== undefined ? mode : 511;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0)
    },
    mkdirTree: function(path, mode) {
        var dirs = path.split("/");
        var d = "";
        for (var i = 0; i < dirs.length; ++i) {
            if (!dirs[i]) continue;
            d += "/" + dirs[i];
            try {
                FS.mkdir(d, mode)
            } catch (e) {
                if (e.errno != 20) throw e
            }
        }
    },
    mkdev: function(path, mode, dev) {
        if (typeof dev === "undefined") {
            dev = mode;
            mode = 438
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev)
    },
    symlink: function(oldpath, newpath) {
        if (!PATH_FS.resolve(oldpath)) {
            throw new FS.ErrnoError(44)
        }
        var lookup = FS.lookupPath(newpath, {
            parent: true
        });
        var parent = lookup.node;
        if (!parent) {
            throw new FS.ErrnoError(44)
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.symlink) {
            throw new FS.ErrnoError(63)
        }
        return parent.node_ops.symlink(parent, newname, oldpath)
    },
    rename: function(old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        var lookup, old_dir, new_dir;
        lookup = FS.lookupPath(old_path, {
            parent: true
        });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, {
            parent: true
        });
        new_dir = lookup.node;
        if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
        if (old_dir.mount !== new_dir.mount) {
            throw new FS.ErrnoError(75)
        }
        var old_node = FS.lookupNode(old_dir, old_name);
        var relative = PATH_FS.relative(old_path, new_dirname);
        if (relative.charAt(0) !== ".") {
            throw new FS.ErrnoError(28)
        }
        relative = PATH_FS.relative(new_path, old_dirname);
        if (relative.charAt(0) !== ".") {
            throw new FS.ErrnoError(55)
        }
        var new_node;
        try {
            new_node = FS.lookupNode(new_dir, new_name)
        } catch (e) {}
        if (old_node === new_node) {
            return
        }
        var isdir = FS.isDir(old_node.mode);
        var errCode = FS.mayDelete(old_dir, old_name, isdir);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!old_dir.node_ops.rename) {
            throw new FS.ErrnoError(63)
        }
        if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
            throw new FS.ErrnoError(10)
        }
        if (new_dir !== old_dir) {
            errCode = FS.nodePermissions(old_dir, "w");
            if (errCode) {
                throw new FS.ErrnoError(errCode)
            }
        }
        try {
            if (FS.trackingDelegate["willMovePath"]) {
                FS.trackingDelegate["willMovePath"](old_path, new_path)
            }
        } catch (e) {
            err("FS.trackingDelegate['willMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
        }
        FS.hashRemoveNode(old_node);
        try {
            old_dir.node_ops.rename(old_node, new_dir, new_name)
        } catch (e) {
            throw e
        } finally {
            FS.hashAddNode(old_node)
        }
        try {
            if (FS.trackingDelegate["onMovePath"]) FS.trackingDelegate["onMovePath"](old_path, new_path)
        } catch (e) {
            err("FS.trackingDelegate['onMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
        }
    },
    rmdir: function(path) {
        var lookup = FS.lookupPath(path, {
            parent: true
        });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, true);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.rmdir) {
            throw new FS.ErrnoError(63)
        }
        if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10)
        }
        try {
            if (FS.trackingDelegate["willDeletePath"]) {
                FS.trackingDelegate["willDeletePath"](path)
            }
        } catch (e) {
            err("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
            if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path)
        } catch (e) {
            err("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
        }
    },
    readdir: function(path) {
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
            throw new FS.ErrnoError(54)
        }
        return node.node_ops.readdir(node)
    },
    unlink: function(path) {
        var lookup = FS.lookupPath(path, {
            parent: true
        });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, false);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.unlink) {
            throw new FS.ErrnoError(63)
        }
        if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10)
        }
        try {
            if (FS.trackingDelegate["willDeletePath"]) {
                FS.trackingDelegate["willDeletePath"](path)
            }
        } catch (e) {
            err("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
            if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path)
        } catch (e) {
            err("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
        }
    },
    readlink: function(path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
            throw new FS.ErrnoError(44)
        }
        if (!link.node_ops.readlink) {
            throw new FS.ErrnoError(28)
        }
        return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link))
    },
    stat: function(path, dontFollow) {
        var lookup = FS.lookupPath(path, {
            follow: !dontFollow
        });
        var node = lookup.node;
        if (!node) {
            throw new FS.ErrnoError(44)
        }
        if (!node.node_ops.getattr) {
            throw new FS.ErrnoError(63)
        }
        return node.node_ops.getattr(node)
    },
    lstat: function(path) {
        return FS.stat(path, true)
    },
    chmod: function(path, mode, dontFollow) {
        var node;
        if (typeof path === "string") {
            var lookup = FS.lookupPath(path, {
                follow: !dontFollow
            });
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(63)
        }
        node.node_ops.setattr(node, {
            mode: mode & 4095 | node.mode & ~4095,
            timestamp: Date.now()
        })
    },
    lchmod: function(path, mode) {
        FS.chmod(path, mode, true)
    },
    fchmod: function(fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(8)
        }
        FS.chmod(stream.node, mode)
    },
    chown: function(path, uid, gid, dontFollow) {
        var node;
        if (typeof path === "string") {
            var lookup = FS.lookupPath(path, {
                follow: !dontFollow
            });
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(63)
        }
        node.node_ops.setattr(node, {
            timestamp: Date.now()
        })
    },
    lchown: function(path, uid, gid) {
        FS.chown(path, uid, gid, true)
    },
    fchown: function(fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(8)
        }
        FS.chown(stream.node, uid, gid)
    },
    truncate: function(path, len) {
        if (len < 0) {
            throw new FS.ErrnoError(28)
        }
        var node;
        if (typeof path === "string") {
            var lookup = FS.lookupPath(path, {
                follow: true
            });
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(63)
        }
        if (FS.isDir(node.mode)) {
            throw new FS.ErrnoError(31)
        }
        if (!FS.isFile(node.mode)) {
            throw new FS.ErrnoError(28)
        }
        var errCode = FS.nodePermissions(node, "w");
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        node.node_ops.setattr(node, {
            size: len,
            timestamp: Date.now()
        })
    },
    ftruncate: function(fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(8)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(28)
        }
        FS.truncate(stream.node, len)
    },
    utime: function(path, atime, mtime) {
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        var node = lookup.node;
        node.node_ops.setattr(node, {
            timestamp: Math.max(atime, mtime)
        })
    },
    open: function(path, flags, mode, fd_start, fd_end) {
        if (path === "") {
            throw new FS.ErrnoError(44)
        }
        flags = typeof flags === "string" ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === "undefined" ? 438 : mode;
        if (flags & 64) {
            mode = mode & 4095 | 32768
        } else {
            mode = 0
        }
        var node;
        if (typeof path === "object") {
            node = path
        } else {
            path = PATH.normalize(path);
            try {
                var lookup = FS.lookupPath(path, {
                    follow: !(flags & 131072)
                });
                node = lookup.node
            } catch (e) {}
        }
        var created = false;
        if (flags & 64) {
            if (node) {
                if (flags & 128) {
                    throw new FS.ErrnoError(20)
                }
            } else {
                node = FS.mknod(path, mode, 0);
                created = true
            }
        }
        if (!node) {
            throw new FS.ErrnoError(44)
        }
        if (FS.isChrdev(node.mode)) {
            flags &= ~512
        }
        if (flags & 65536 && !FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54)
        }
        if (!created) {
            var errCode = FS.mayOpen(node, flags);
            if (errCode) {
                throw new FS.ErrnoError(errCode)
            }
        }
        if (flags & 512) {
            FS.truncate(node, 0)
        }
        flags &= ~(128 | 512 | 131072);
        var stream = FS.createStream({
            node: node,
            path: FS.getPath(node),
            flags: flags,
            seekable: true,
            position: 0,
            stream_ops: node.stream_ops,
            ungotten: [],
            error: false
        }, fd_start, fd_end);
        if (stream.stream_ops.open) {
            stream.stream_ops.open(stream)
        }
        if (Module["logReadFiles"] && !(flags & 1)) {
            if (!FS.readFiles) FS.readFiles = {};
            if (!(path in FS.readFiles)) {
                FS.readFiles[path] = 1;
                err("FS.trackingDelegate error on read file: " + path)
            }
        }
        try {
            if (FS.trackingDelegate["onOpenFile"]) {
                var trackingFlags = 0;
                if ((flags & 2097155) !== 1) {
                    trackingFlags |= FS.tracking.openFlags.READ
                }
                if ((flags & 2097155) !== 0) {
                    trackingFlags |= FS.tracking.openFlags.WRITE
                }
                FS.trackingDelegate["onOpenFile"](path, trackingFlags)
            }
        } catch (e) {
            err("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message)
        }
        return stream
    },
    close: function(stream) {
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if (stream.getdents) stream.getdents = null;
        try {
            if (stream.stream_ops.close) {
                stream.stream_ops.close(stream)
            }
        } catch (e) {
            throw e
        } finally {
            FS.closeStream(stream.fd)
        }
        stream.fd = null
    },
    isClosed: function(stream) {
        return stream.fd === null
    },
    llseek: function(stream, offset, whence) {
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
            throw new FS.ErrnoError(70)
        }
        if (whence != 0 && whence != 1 && whence != 2) {
            throw new FS.ErrnoError(28)
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position
    },
    read: function(stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
            throw new FS.ErrnoError(28)
        }
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if ((stream.flags & 2097155) === 1) {
            throw new FS.ErrnoError(8)
        }
        if (FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(31)
        }
        if (!stream.stream_ops.read) {
            throw new FS.ErrnoError(28)
        }
        var seeking = typeof position !== "undefined";
        if (!seeking) {
            position = stream.position
        } else if (!stream.seekable) {
            throw new FS.ErrnoError(70)
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead
    },
    write: function(stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
            throw new FS.ErrnoError(28)
        }
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(8)
        }
        if (FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(31)
        }
        if (!stream.stream_ops.write) {
            throw new FS.ErrnoError(28)
        }
        if (stream.seekable && stream.flags & 1024) {
            FS.llseek(stream, 0, 2)
        }
        var seeking = typeof position !== "undefined";
        if (!seeking) {
            position = stream.position
        } else if (!stream.seekable) {
            throw new FS.ErrnoError(70)
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        try {
            if (stream.path && FS.trackingDelegate["onWriteToFile"]) FS.trackingDelegate["onWriteToFile"](stream.path)
        } catch (e) {
            err("FS.trackingDelegate['onWriteToFile']('" + stream.path + "') threw an exception: " + e.message)
        }
        return bytesWritten
    },
    allocate: function(stream, offset, length) {
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if (offset < 0 || length <= 0) {
            throw new FS.ErrnoError(28)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(8)
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(43)
        }
        if (!stream.stream_ops.allocate) {
            throw new FS.ErrnoError(138)
        }
        stream.stream_ops.allocate(stream, offset, length)
    },
    mmap: function(stream, address, length, position, prot, flags) {
        if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
            throw new FS.ErrnoError(2)
        }
        if ((stream.flags & 2097155) === 1) {
            throw new FS.ErrnoError(2)
        }
        if (!stream.stream_ops.mmap) {
            throw new FS.ErrnoError(43)
        }
        return stream.stream_ops.mmap(stream, address, length, position, prot, flags)
    },
    msync: function(stream, buffer, offset, length, mmapFlags) {
        if (!stream || !stream.stream_ops.msync) {
            return 0
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags)
    },
    munmap: function(stream) {
        return 0
    },
    ioctl: function(stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
            throw new FS.ErrnoError(59)
        }
        return stream.stream_ops.ioctl(stream, cmd, arg)
    },
    readFile: function(path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 0;
        opts.encoding = opts.encoding || "binary";
        if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
            throw new Error('Invalid encoding type "' + opts.encoding + '"')
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === "utf8") {
            ret = UTF8ArrayToString(buf, 0)
        } else if (opts.encoding === "binary") {
            ret = buf
        }
        FS.close(stream);
        return ret
    },
    writeFile: function(path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 577;
        var stream = FS.open(path, opts.flags, opts.mode);
        if (typeof data === "string") {
            var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
            var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
            FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn)
        } else if (ArrayBuffer.isView(data)) {
            FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn)
        } else {
            throw new Error("Unsupported data type")
        }
        FS.close(stream)
    },
    cwd: function() {
        return FS.currentPath
    },
    chdir: function(path) {
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        if (lookup.node === null) {
            throw new FS.ErrnoError(44)
        }
        if (!FS.isDir(lookup.node.mode)) {
            throw new FS.ErrnoError(54)
        }
        var errCode = FS.nodePermissions(lookup.node, "x");
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        FS.currentPath = lookup.path
    },
    createDefaultDirectories: function() {
        FS.mkdir("/tmp");
        FS.mkdir("/home");
        FS.mkdir("/home/web_user")
    },
    createDefaultDevices: function() {
        FS.mkdir("/dev");
        FS.registerDevice(FS.makedev(1, 3), {
            read: function() {
                return 0
            },
            write: function(stream, buffer, offset, length, pos) {
                return length
            }
        });
        FS.mkdev("/dev/null", FS.makedev(1, 3));
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev("/dev/tty", FS.makedev(5, 0));
        FS.mkdev("/dev/tty1", FS.makedev(6, 0));
        var random_device = getRandomDevice();
        FS.createDevice("/dev", "random", random_device);
        FS.createDevice("/dev", "urandom", random_device);
        FS.mkdir("/dev/shm");
        FS.mkdir("/dev/shm/tmp")
    },
    createSpecialDirectories: function() {
        FS.mkdir("/proc");
        FS.mkdir("/proc/self");
        FS.mkdir("/proc/self/fd");
        FS.mount({
            mount: function() {
                var node = FS.createNode("/proc/self", "fd", 16384 | 511, 73);
                node.node_ops = {
                    lookup: function(parent, name) {
                        var fd = +name;
                        var stream = FS.getStream(fd);
                        if (!stream) throw new FS.ErrnoError(8);
                        var ret = {
                            parent: null,
                            mount: {
                                mountpoint: "fake"
                            },
                            node_ops: {
                                readlink: function() {
                                    return stream.path
                                }
                            }
                        };
                        ret.parent = ret;
                        return ret
                    }
                };
                return node
            }
        }, {}, "/proc/self/fd")
    },
    createStandardStreams: function() {
        if (Module["stdin"]) {
            FS.createDevice("/dev", "stdin", Module["stdin"])
        } else {
            FS.symlink("/dev/tty", "/dev/stdin")
        }
        if (Module["stdout"]) {
            FS.createDevice("/dev", "stdout", null, Module["stdout"])
        } else {
            FS.symlink("/dev/tty", "/dev/stdout")
        }
        if (Module["stderr"]) {
            FS.createDevice("/dev", "stderr", null, Module["stderr"])
        } else {
            FS.symlink("/dev/tty1", "/dev/stderr")
        }
        var stdin = FS.open("/dev/stdin", 0);
        var stdout = FS.open("/dev/stdout", 1);
        var stderr = FS.open("/dev/stderr", 1)
    },
    ensureErrnoError: function() {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno, node) {
            this.node = node;
            this.setErrno = function(errno) {
                this.errno = errno
            };
            this.setErrno(errno);
            this.message = "FS error"
        };
        FS.ErrnoError.prototype = new Error;
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        [44].forEach(function(code) {
            FS.genericErrors[code] = new FS.ErrnoError(code);
            FS.genericErrors[code].stack = "<generic error, no stack>"
        })
    },
    staticInit: function() {
        FS.ensureErrnoError();
        FS.nameTable = new Array(4096);
        FS.mount(MEMFS, {}, "/");
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
        FS.filesystems = {
            "MEMFS": MEMFS
        }
    },
    init: function(input, output, error) {
        FS.init.initialized = true;
        FS.ensureErrnoError();
        Module["stdin"] = input || Module["stdin"];
        Module["stdout"] = output || Module["stdout"];
        Module["stderr"] = error || Module["stderr"];
        FS.createStandardStreams()
    },
    quit: function() {
        FS.init.initialized = false;
        var fflush = Module["_fflush"];
        if (fflush) fflush(0);
        for (var i = 0; i < FS.streams.length; i++) {
            var stream = FS.streams[i];
            if (!stream) {
                continue
            }
            FS.close(stream)
        }
    },
    getMode: function(canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode
    },
    findObject: function(path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
            return ret.object
        } else {
            return null
        }
    },
    analyzePath: function(path, dontResolveLastLink) {
        try {
            var lookup = FS.lookupPath(path, {
                follow: !dontResolveLastLink
            });
            path = lookup.path
        } catch (e) {}
        var ret = {
            isRoot: false,
            exists: false,
            error: 0,
            name: null,
            path: null,
            object: null,
            parentExists: false,
            parentPath: null,
            parentObject: null
        };
        try {
            var lookup = FS.lookupPath(path, {
                parent: true
            });
            ret.parentExists = true;
            ret.parentPath = lookup.path;
            ret.parentObject = lookup.node;
            ret.name = PATH.basename(path);
            lookup = FS.lookupPath(path, {
                follow: !dontResolveLastLink
            });
            ret.exists = true;
            ret.path = lookup.path;
            ret.object = lookup.node;
            ret.name = lookup.node.name;
            ret.isRoot = lookup.path === "/"
        } catch (e) {
            ret.error = e.errno
        }
        return ret
    },
    createPath: function(parent, path, canRead, canWrite) {
        parent = typeof parent === "string" ? parent : FS.getPath(parent);
        var parts = path.split("/").reverse();
        while (parts.length) {
            var part = parts.pop();
            if (!part) continue;
            var current = PATH.join2(parent, part);
            try {
                FS.mkdir(current)
            } catch (e) {}
            parent = current
        }
        return current
    },
    createFile: function(parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode)
    },
    createDataFile: function(parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
            if (typeof data === "string") {
                var arr = new Array(data.length);
                for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
                data = arr
            }
            FS.chmod(node, mode | 146);
            var stream = FS.open(node, 577);
            FS.write(stream, data, 0, data.length, 0, canOwn);
            FS.close(stream);
            FS.chmod(node, mode)
        }
        return node
    },
    createDevice: function(parent, name, input, output) {
        var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        FS.registerDevice(dev, {
            open: function(stream) {
                stream.seekable = false
            },
            close: function(stream) {
                if (output && output.buffer && output.buffer.length) {
                    output(10)
                }
            },
            read: function(stream, buffer, offset, length, pos) {
                var bytesRead = 0;
                for (var i = 0; i < length; i++) {
                    var result;
                    try {
                        result = input()
                    } catch (e) {
                        throw new FS.ErrnoError(29)
                    }
                    if (result === undefined && bytesRead === 0) {
                        throw new FS.ErrnoError(6)
                    }
                    if (result === null || result === undefined) break;
                    bytesRead++;
                    buffer[offset + i] = result
                }
                if (bytesRead) {
                    stream.node.timestamp = Date.now()
                }
                return bytesRead
            },
            write: function(stream, buffer, offset, length, pos) {
                for (var i = 0; i < length; i++) {
                    try {
                        output(buffer[offset + i])
                    } catch (e) {
                        throw new FS.ErrnoError(29)
                    }
                }
                if (length) {
                    stream.node.timestamp = Date.now()
                }
                return i
            }
        });
        return FS.mkdev(path, mode, dev)
    },
    forceLoadFile: function(obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        if (typeof XMLHttpRequest !== "undefined") {
            throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")
        } else if (read_) {
            try {
                obj.contents = intArrayFromString(read_(obj.url), true);
                obj.usedBytes = obj.contents.length
            } catch (e) {
                throw new FS.ErrnoError(29)
            }
        } else {
            throw new Error("Cannot load without read() or XMLHttpRequest.")
        }
    },
    createLazyFile: function(parent, name, url, canRead, canWrite) {
        function LazyUint8Array() {
            this.lengthKnown = false;
            this.chunks = []
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
            if (idx > this.length - 1 || idx < 0) {
                return undefined
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = idx / this.chunkSize | 0;
            return this.getter(chunkNum)[chunkOffset]
        };
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
            this.getter = getter
        };
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
            var xhr = new XMLHttpRequest;
            xhr.open("HEAD", url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            var datalength = Number(xhr.getResponseHeader("Content-length"));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
            var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
            var chunkSize = 1024 * 1024;
            if (!hasByteServing) chunkSize = datalength;
            var doXHR = function(from, to) {
                if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
                if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
                var xhr = new XMLHttpRequest;
                xhr.open("GET", url, false);
                if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
                if (typeof Uint8Array != "undefined") xhr.responseType = "arraybuffer";
                if (xhr.overrideMimeType) {
                    xhr.overrideMimeType("text/plain; charset=x-user-defined")
                }
                xhr.send(null);
                if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                if (xhr.response !== undefined) {
                    return new Uint8Array(xhr.response || [])
                } else {
                    return intArrayFromString(xhr.responseText || "", true)
                }
            };
            var lazyArray = this;
            lazyArray.setDataGetter(function(chunkNum) {
                var start = chunkNum * chunkSize;
                var end = (chunkNum + 1) * chunkSize - 1;
                end = Math.min(end, datalength - 1);
                if (typeof lazyArray.chunks[chunkNum] === "undefined") {
                    lazyArray.chunks[chunkNum] = doXHR(start, end)
                }
                if (typeof lazyArray.chunks[chunkNum] === "undefined") throw new Error("doXHR failed!");
                return lazyArray.chunks[chunkNum]
            });
            if (usesGzip || !datalength) {
                chunkSize = datalength = 1;
                datalength = this.getter(0).length;
                chunkSize = datalength;
                out("LazyFiles on gzip forces download of the whole file when length is accessed")
            }
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true
        };
        if (typeof XMLHttpRequest !== "undefined") {
            if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
            var lazyArray = new LazyUint8Array;
            Object.defineProperties(lazyArray, {
                length: {
                    get: function() {
                        if (!this.lengthKnown) {
                            this.cacheLength()
                        }
                        return this._length
                    }
                },
                chunkSize: {
                    get: function() {
                        if (!this.lengthKnown) {
                            this.cacheLength()
                        }
                        return this._chunkSize
                    }
                }
            });
            var properties = {
                isDevice: false,
                contents: lazyArray
            }
        } else {
            var properties = {
                isDevice: false,
                url: url
            }
        }
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        if (properties.contents) {
            node.contents = properties.contents
        } else if (properties.url) {
            node.contents = null;
            node.url = properties.url
        }
        Object.defineProperties(node, {
            usedBytes: {
                get: function() {
                    return this.contents.length
                }
            }
        });
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
            var fn = node.stream_ops[key];
            stream_ops[key] = function forceLoadLazyFile() {
                FS.forceLoadFile(node);
                return fn.apply(null, arguments)
            }
        });
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
            FS.forceLoadFile(node);
            var contents = stream.node.contents;
            if (position >= contents.length) return 0;
            var size = Math.min(contents.length - position, length);
            if (contents.slice) {
                for (var i = 0; i < size; i++) {
                    buffer[offset + i] = contents[position + i]
                }
            } else {
                for (var i = 0; i < size; i++) {
                    buffer[offset + i] = contents.get(position + i)
                }
            }
            return size
        };
        node.stream_ops = stream_ops;
        return node
    },
    createPreloadedFile: function(parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
        Browser.init();
        var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
        var dep = getUniqueRunDependency("cp " + fullname);

        function processData(byteArray) {
            function finish(byteArray) {
                if (preFinish) preFinish();
                if (!dontCreateFile) {
                    FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn)
                }
                if (onload) onload();
                removeRunDependency(dep)
            }
            var handled = false;
            Module["preloadPlugins"].forEach(function(plugin) {
                if (handled) return;
                if (plugin["canHandle"](fullname)) {
                    plugin["handle"](byteArray, fullname, finish, function() {
                        if (onerror) onerror();
                        removeRunDependency(dep)
                    });
                    handled = true
                }
            });
            if (!handled) finish(byteArray)
        }
        addRunDependency(dep);
        if (typeof url == "string") {
            Browser.asyncLoad(url, function(byteArray) {
                processData(byteArray)
            }, onerror)
        } else {
            processData(url)
        }
    },
    indexedDB: function() {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB
    },
    DB_NAME: function() {
        return "EM_FS_" + window.location.pathname
    },
    DB_VERSION: 20,
    DB_STORE_NAME: "FILE_DATA",
    saveFilesToDB: function(paths, onload, onerror) {
        onload = onload || function() {};
        onerror = onerror || function() {};
        var indexedDB = FS.indexedDB();
        try {
            var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
        } catch (e) {
            return onerror(e)
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
            out("creating db");
            var db = openRequest.result;
            db.createObjectStore(FS.DB_STORE_NAME)
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
            var db = openRequest.result;
            var transaction = db.transaction([FS.DB_STORE_NAME], "readwrite");
            var files = transaction.objectStore(FS.DB_STORE_NAME);
            var ok = 0,
                fail = 0,
                total = paths.length;

            function finish() {
                if (fail == 0) onload();
                else onerror()
            }
            paths.forEach(function(path) {
                var putRequest = files.put(FS.analyzePath(path).object.contents, path);
                putRequest.onsuccess = function putRequest_onsuccess() {
                    ok++;
                    if (ok + fail == total) finish()
                };
                putRequest.onerror = function putRequest_onerror() {
                    fail++;
                    if (ok + fail == total) finish()
                }
            });
            transaction.onerror = onerror
        };
        openRequest.onerror = onerror
    },
    loadFilesFromDB: function(paths, onload, onerror) {
        onload = onload || function() {};
        onerror = onerror || function() {};
        var indexedDB = FS.indexedDB();
        try {
            var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
        } catch (e) {
            return onerror(e)
        }
        openRequest.onupgradeneeded = onerror;
        openRequest.onsuccess = function openRequest_onsuccess() {
            var db = openRequest.result;
            try {
                var transaction = db.transaction([FS.DB_STORE_NAME], "readonly")
            } catch (e) {
                onerror(e);
                return
            }
            var files = transaction.objectStore(FS.DB_STORE_NAME);
            var ok = 0,
                fail = 0,
                total = paths.length;

            function finish() {
                if (fail == 0) onload();
                else onerror()
            }
            paths.forEach(function(path) {
                var getRequest = files.get(path);
                getRequest.onsuccess = function getRequest_onsuccess() {
                    if (FS.analyzePath(path).exists) {
                        FS.unlink(path)
                    }
                    FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
                    ok++;
                    if (ok + fail == total) finish()
                };
                getRequest.onerror = function getRequest_onerror() {
                    fail++;
                    if (ok + fail == total) finish()
                }
            });
            transaction.onerror = onerror
        };
        openRequest.onerror = onerror
    }
};
var SYSCALLS = {
    mappings: {},
    DEFAULT_POLLMASK: 5,
    umask: 511,
    calculateAt: function(dirfd, path) {
        if (path[0] !== "/") {
            var dir;
            if (dirfd === -100) {
                dir = FS.cwd()
            } else {
                var dirstream = FS.getStream(dirfd);
                if (!dirstream) throw new FS.ErrnoError(8);
                dir = dirstream.path
            }
            path = PATH.join2(dir, path)
        }
        return path
    },
    doStat: function(func, path, buf) {
        try {
            var stat = func(path)
        } catch (e) {
            if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
                return -54
            }
            throw e
        }
        HEAP32[buf >> 2] = stat.dev;
        HEAP32[buf + 4 >> 2] = 0;
        HEAP32[buf + 8 >> 2] = stat.ino;
        HEAP32[buf + 12 >> 2] = stat.mode;
        HEAP32[buf + 16 >> 2] = stat.nlink;
        HEAP32[buf + 20 >> 2] = stat.uid;
        HEAP32[buf + 24 >> 2] = stat.gid;
        HEAP32[buf + 28 >> 2] = stat.rdev;
        HEAP32[buf + 32 >> 2] = 0;
        tempI64 = [stat.size >>> 0, (tempDouble = stat.size, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 40 >> 2] = tempI64[0], HEAP32[buf + 44 >> 2] = tempI64[1];
        HEAP32[buf + 48 >> 2] = 4096;
        HEAP32[buf + 52 >> 2] = stat.blocks;
        HEAP32[buf + 56 >> 2] = stat.atime.getTime() / 1e3 | 0;
        HEAP32[buf + 60 >> 2] = 0;
        HEAP32[buf + 64 >> 2] = stat.mtime.getTime() / 1e3 | 0;
        HEAP32[buf + 68 >> 2] = 0;
        HEAP32[buf + 72 >> 2] = stat.ctime.getTime() / 1e3 | 0;
        HEAP32[buf + 76 >> 2] = 0;
        tempI64 = [stat.ino >>> 0, (tempDouble = stat.ino, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 80 >> 2] = tempI64[0], HEAP32[buf + 84 >> 2] = tempI64[1];
        return 0
    },
    doMsync: function(addr, stream, len, flags, offset) {
        var buffer = HEAPU8.slice(addr, addr + len);
        FS.msync(stream, buffer, offset, len, flags)
    },
    doMkdir: function(path, mode) {
        path = PATH.normalize(path);
        if (path[path.length - 1] === "/") path = path.substr(0, path.length - 1);
        FS.mkdir(path, mode, 0);
        return 0
    },
    doMknod: function(path, mode, dev) {
        switch (mode & 61440) {
            case 32768:
            case 8192:
            case 24576:
            case 4096:
            case 49152:
                break;
            default:
                return -28
        }
        FS.mknod(path, mode, dev);
        return 0
    },
    doReadlink: function(path, buf, bufsize) {
        if (bufsize <= 0) return -28;
        var ret = FS.readlink(path);
        var len = Math.min(bufsize, lengthBytesUTF8(ret));
        var endChar = HEAP8[buf + len];
        stringToUTF8(ret, buf, bufsize + 1);
        HEAP8[buf + len] = endChar;
        return len
    },
    doAccess: function(path, amode) {
        if (amode & ~7) {
            return -28
        }
        var node;
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        node = lookup.node;
        if (!node) {
            return -44
        }
        var perms = "";
        if (amode & 4) perms += "r";
        if (amode & 2) perms += "w";
        if (amode & 1) perms += "x";
        if (perms && FS.nodePermissions(node, perms)) {
            return -2
        }
        return 0
    },
    doDup: function(path, flags, suggestFD) {
        var suggest = FS.getStream(suggestFD);
        if (suggest) FS.close(suggest);
        return FS.open(path, flags, 0, suggestFD, suggestFD).fd
    },
    doReadv: function(stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
            var ptr = HEAP32[iov + i * 8 >> 2];
            var len = HEAP32[iov + (i * 8 + 4) >> 2];
            var curr = FS.read(stream, HEAP8, ptr, len, offset);
            if (curr < 0) return -1;
            ret += curr;
            if (curr < len) break
        }
        return ret
    },
    doWritev: function(stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
            var ptr = HEAP32[iov + i * 8 >> 2];
            var len = HEAP32[iov + (i * 8 + 4) >> 2];
            var curr = FS.write(stream, HEAP8, ptr, len, offset);
            if (curr < 0) return -1;
            ret += curr
        }
        return ret
    },
    varargs: undefined,
    get: function() {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
        return ret
    },
    getStr: function(ptr) {
        var ret = UTF8ToString(ptr);
        return ret
    },
    getStreamFromFD: function(fd) {
        var stream = FS.getStream(fd);
        if (!stream) throw new FS.ErrnoError(8);
        return stream
    },
    get64: function(low, high) {
        return low
    }
};

function syscallMmap2(addr, len, prot, flags, fd, off) {
    off <<= 12;
    var ptr;
    var allocated = false;
    if ((flags & 16) !== 0 && addr % 16384 !== 0) {
        return -28
    }
    if ((flags & 32) !== 0) {
        ptr = _memalign(16384, len);
        if (!ptr) return -48;
        _memset(ptr, 0, len);
        allocated = true
    } else {
        var info = FS.getStream(fd);
        if (!info) return -8;
        var res = FS.mmap(info, addr, len, off, prot, flags);
        ptr = res.ptr;
        allocated = res.allocated
    }
    SYSCALLS.mappings[ptr] = {
        malloc: ptr,
        len: len,
        allocated: allocated,
        fd: fd,
        prot: prot,
        flags: flags,
        offset: off
    };
    return ptr
}

function ___sys_mmap2(addr, len, prot, flags, fd, off) {
    try {
        return syscallMmap2(addr, len, prot, flags, fd, off)
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return -e.errno
    }
}

function syscallMunmap(addr, len) {
    if ((addr | 0) === -1 || len === 0) {
        return -28
    }
    var info = SYSCALLS.mappings[addr];
    if (!info) return 0;
    if (len === info.len) {
        var stream = FS.getStream(info.fd);
        if (info.prot & 2) {
            SYSCALLS.doMsync(addr, stream, len, info.flags, info.offset)
        }
        FS.munmap(stream);
        SYSCALLS.mappings[addr] = null;
        if (info.allocated) {
            _free(info.malloc)
        }
    }
    return 0
}

function ___sys_munmap(addr, len) {
    try {
        return syscallMunmap(addr, len)
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
        return -e.errno
    }
}

function _emscripten_memcpy_big(dest, src, num) {
    HEAPU8.copyWithin(dest, src, src + num)
}

function abortOnCannotGrowMemory(requestedSize) {
    abort("OOM")
}

function _emscripten_resize_heap(requestedSize) {
    requestedSize = requestedSize >>> 0;
    abortOnCannotGrowMemory(requestedSize)
}
var FSNode = function(parent, name, mode, rdev) {
    if (!parent) {
        parent = this
    }
    this.parent = parent;
    this.mount = parent.mount;
    this.mounted = null;
    this.id = FS.nextInode++;
    this.name = name;
    this.mode = mode;
    this.node_ops = {};
    this.stream_ops = {};
    this.rdev = rdev
};
var readMode = 292 | 73;
var writeMode = 146;
Object.defineProperties(FSNode.prototype, {
    read: {
        get: function() {
            return (this.mode & readMode) === readMode
        },
        set: function(val) {
            val ? this.mode |= readMode : this.mode &= ~readMode
        }
    },
    write: {
        get: function() {
            return (this.mode & writeMode) === writeMode
        },
        set: function(val) {
            val ? this.mode |= writeMode : this.mode &= ~writeMode
        }
    },
    isFolder: {
        get: function() {
            return FS.isDir(this.mode)
        }
    },
    isDevice: {
        get: function() {
            return FS.isChrdev(this.mode)
        }
    }
});
FS.FSNode = FSNode;
FS.staticInit();

function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array
}
__ATINIT__.push({
    func: function() {
        ___wasm_call_ctors()
    }
});
var asmLibraryArg = {
    "e": ___assert_fail,
    "c": ___sys_mmap2,
    "d": ___sys_munmap,
    "b": _emscripten_memcpy_big,
    "a": _emscripten_resize_heap
};
var asm = createWasm();
var ___wasm_call_ctors = Module["___wasm_call_ctors"] = function() {
    return (___wasm_call_ctors = Module["___wasm_call_ctors"] = Module["asm"]["h"]).apply(null, arguments)
};
var _sha256d_str = Module["_sha256d_str"] = function() {
    return (_sha256d_str = Module["_sha256d_str"] = Module["asm"]["i"]).apply(null, arguments)
};
var _memset = Module["_memset"] = function() {
    return (_memset = Module["_memset"] = Module["asm"]["j"]).apply(null, arguments)
};
var _miner_thread = Module["_miner_thread"] = function() {
    return (_miner_thread = Module["_miner_thread"] = Module["asm"]["k"]).apply(null, arguments)
};
var stackSave = Module["stackSave"] = function() {
    return (stackSave = Module["stackSave"] = Module["asm"]["l"]).apply(null, arguments)
};
var stackRestore = Module["stackRestore"] = function() {
    return (stackRestore = Module["stackRestore"] = Module["asm"]["m"]).apply(null, arguments)
};
var stackAlloc = Module["stackAlloc"] = function() {
    return (stackAlloc = Module["stackAlloc"] = Module["asm"]["n"]).apply(null, arguments)
};
var _malloc = Module["_malloc"] = function() {
    return (_malloc = Module["_malloc"] = Module["asm"]["o"]).apply(null, arguments)
};
var _free = Module["_free"] = function() {
    return (_free = Module["_free"] = Module["asm"]["p"]).apply(null, arguments)
};
var _memalign = Module["_memalign"] = function() {
    return (_memalign = Module["_memalign"] = Module["asm"]["q"]).apply(null, arguments)
};
Module["ccall"] = ccall;
Module["cwrap"] = cwrap;
var calledRun;

function ExitStatus(status) {
    this.name = "ExitStatus";
    this.message = "Program terminated with exit(" + status + ")";
    this.status = status
}
dependenciesFulfilled = function runCaller() {
    if (!calledRun) run();
    if (!calledRun) dependenciesFulfilled = runCaller
};

function run(args) {
    args = args || arguments_;
    if (runDependencies > 0) {
        return
    }
    preRun();
    if (runDependencies > 0) return;

    function doRun() {
        if (calledRun) return;
        calledRun = true;
        Module["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        preMain();
        if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
        postRun()
    }
    if (Module["setStatus"]) {
        Module["setStatus"]("Running...");
        setTimeout(function() {
            setTimeout(function() {
                Module["setStatus"]("")
            }, 1);
            doRun()
        }, 1)
    } else {
        doRun()
    }
}
Module["run"] = run;
if (Module["preInit"]) {
    if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
    while (Module["preInit"].length > 0) {
        Module["preInit"].pop()()
    }
}
noExitRuntime = true;
run();
/*-
 * Copyright 2017 ohac
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted.
 *
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS ``AS IS'' AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 */
var miner = function(work){
  var sha256d_str2 = Module.cwrap('sha256d_str', 'string',
    ['string', 'string', 'string', 'string', 'string']);
  var miner_thread2 = Module.cwrap('miner_thread', 'string',
    ['string', 'string', 'number']);
  if (work.jobid) {
    var xnonce2 = Math.floor(Math.random() * Math.pow(2, work.xnonce2len * 8)).toString(16).padStart(8, '0');
    var merklestr = '';
    for (var i = 0; i < work.merkles.length; i++) {
      merklestr += work.merkles[i];
    }

    var merkleroot = sha256d_str2(
      work.coinb1,
      work.xnonce1,
      xnonce2,
      work.coinb2,
      merklestr);

    var nonce = '00000000';

    var blockheader0 =
      work.version +
      work.prevhash +
      merkleroot +
      work.ntime +
      work.nbits;
    var blockheader = blockheader0 + nonce;
    var nonce_and_hash = miner_thread2(blockheader, work.diff.toString(), work.nonce);
    var nah = nonce_and_hash.split(',');
    postMessage([xnonce2, nah[0], nah[1]]);
  }
};

self.addEventListener('message', (message) => {
  var f = function(msg){
    var data = msg.data;
    if (data == 'stop') {
      self.close();
    }
    if (data.jobid) {
      miner(data);
    }
  };
  var f2 = function(msg){
    if (Module.ready) {
      f(msg);
    }
    else {
      setTimeout(function(){ f2(msg); }, 10);
    }
  };
  f2(message);
});
