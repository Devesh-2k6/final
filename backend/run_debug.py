import sys
import traceback

try:
    print("Importing main...")
    import main
    print("Import successful! Starting uvicorn...")
    import uvicorn
    uvicorn.run(main.app, host="127.0.0.1", port=8000, log_level="debug")
except Exception as e:
    with open("debug_error.log", "w") as f:
        f.write("ERROR OCCURRED ON STARTUP:\n")
        traceback.print_exc(file=f)
    print("Crashed! Error written to debug_error.log")
    sys.exit(1)
