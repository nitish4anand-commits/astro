import traceback
try:
    import main
    print('IMPORT_OK')
except Exception as e:
    print('IMPORT_FAIL:', repr(e))
    traceback.print_exc()
