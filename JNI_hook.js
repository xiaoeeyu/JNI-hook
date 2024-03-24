function hook_JNI() {
    Java.perform(function () {
        var GetStringUTFChars_addr = null;
        var symbols = Module.enumerateSymbols("libart.so");

        symbols.forEach(function (symbol) {
            // 排除包含 "CheckJNI" 的符号，并且包含 "JNI" 的符号
            if (symbol.name.includes("JNI") && !symbol.name.includes("CheckJNI")) {
                // 查找包含 "GetStringUTFChars" 的符号
                if (symbol.name.includes("GetStringUTFChars")) {
                    console.log("GetStringUTFChars: " + symbol.name);
                    GetStringUTFChars_addr = symbol.address;
                }
            }
        });
        Interceptor.attach(GetStringUTFChars_addr, {
            onEnter: function (args) {
                console.log("art::JNI::GetStringUTFChars(_JNIEnv*, _jstring*, unsigned char*)=> " + args[0], Java.vm.getEnv().getStringUtfChars(args[1], null).readCString(), args[2]);
                // console.log('CCCryptorCreate called from:\n' +
                //     Thread.backtrace(this.context, Backtracer.ACCURATE)
                //         .map(DebugSymbol.fromAddress).join('\n') + '\n');
            },
            onLeave: function (retval) {
                console.log("GetStringUTFChars retval: " + retval.readCString());
            }
        })
    });
}

function replace_JNI() {
    Java.perform(function () {
        var NewStringUTF_addr = null;
        var symbols = Module.enumerateSymbols("libart.so");

        symbols.forEach(function (symbol) {
            // 排除包含 "CheckJNI" 的符号，并且包含 "JNI" 的符号
            if (symbol.name.includes("JNI") && !symbol.name.includes("CheckJNI")) {
                // 查找包含 "GetStringUTFChars" 的符号
                if (symbol.name.includes("NewStringUTF")) {
                    console.log("NewStringUTF name: " + symbol.name);
                    NewStringUTF_addr = symbol.address;
                }
            }
        });
        var NewStringUTF = new NativeFunction(NewStringUTF_addr, "pointer", ["pointer", "pointer"]);
        Interceptor.replace(NewStringUTF_addr, new NativeCallback(function (env, str) {
            console.log("NewStringUTF args: ", env, str.readCString());
            console.log("NewStringUTF result: ", NewStringUTF(env, Memory.allocUtf8String("hooked_NewStringUTF")));
            var newStr = Memory.allocUtf8String("hooked_NewStringUTF");
            var newRet = NewStringUTF(env, newStr);
            return newRet;
        }, "pointer", ["pointer", "pointer"]));
    })
}

function hook_RegisterNatives() {
    Java.perform(function () {
        var RegisterNatives_addr = null;
        var symbols = Module.enumerateSymbols("libart.so");

        symbols.forEach(function (symbol) {
            // 排除包含 "CheckJNI" 的符号，并且包含 "JNI" 的符号
            if (symbol.name.includes("JNI") && !symbol.name.includes("CheckJNI")) {
                // 查找包含 "GetStringUTFChars" 的符号
                if (symbol.name.includes("RegisterNatives")) {
                    console.log("RegisterNatives name: " + symbol.name);
                    RegisterNatives_addr = symbol.address;
                }
            }
        });
        if (RegisterNatives_addr != null) {
            Interceptor.attach(RegisterNatives_addr, {
                onEnter: function (args) {
                    console.log("RegisterNative method counts => ", args[3]);
                    var env = args[0];
                    var clazz = args[1];
                    var class_name = Java.vm.getEnv().getClassName(clazz);
                    var methods_ptr = ptr(args[2]);
                    var method_count = args[3].toInt32();
                    for (var i = 0; i < method_count; i++) {
                        var name_ptr = methods_ptr.add(i * Process.pointerSize * 3).readPointer();
                        var sig_ptr = methods_ptr.add(i * Process.pointerSize * 3 + Process.pointerSize).readPointer();
                        var fnPtr_ptr = methods_ptr.add(i * Process.pointerSize * 3 + Process.pointerSize * 2).readPointer();
                        var find_module = Process.findModuleByAddress(fnPtr_ptr);
                        console.log("RegisterNative class_name => ", class_name);
                        console.log("RegisterNative name => ", Memory.readCString(name_ptr));
                        console.log("RegisterNative sig => ", Memory.readCString(sig_ptr));
                        console.log("RegisterNative fnPtr_ptr => ", JSON.stringify(DebugSymbol.fromAddress(fnPtr_ptr)));
                        console.log("RegisterNative find_module => ", JSON.stringify(find_module));
                        console.log("callee => ", DebugSymbol.fromAddress(this.returnAddress));
                        console.log("offset => ", ptr(fnPtr_ptr).sub(find_module.base));

                    }
                }, onLeave: function () { }
            })
        } else {
            console.log("RegisterNatives_addr is null");
        }
    })
}
setImmediate(hook_RegisterNatives);
