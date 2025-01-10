mkdir -p patch-isolated-vm
cd patch-isolated-vm
#rm -rf isolated-vm
#git clone --depth 1 --branch v5.0.3 https://github.com/laverdet/isolated-vm.git

cd isolated-vm
if [[ ! -f "binding.gyp" ]]; then
  echo "Error: binding.gyp file not found."
  exit 1
fi

sed -i.bak "s/-std=c++17/-std=c++20/g" binding.gyp
diff "binding.gyp.bak" "binding.gyp"

if [[ ! -f "src/isolate/remote_handle.h" ]]; then
  echo "Error: src/isolate/remote_handle.h file not found."
  exit 1
fi

# Fix the HandleTupleElement constructor syntax
#cd src/isolate/
#sed -i.bak 's/v8::Persistent<Type, v8::CopyablePersistentTraits<Type>>/v8::Persistent<Type, v8::NonCopyablePersistentTraits<Type>>/g' "remote_handle.h"
#sed -i 's/v8::CopyablePersistentTraits<v8::Value>/v8::NonCopyablePersistentTraits<v8::Value>/g' "remote_handle.h"
#cd ../..
#
#diff "src/isolate/remote_handle.h.back" "src/isolate/remote_handle.h"

cd ..
npm install ./isolated-vm
