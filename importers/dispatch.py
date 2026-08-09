"""Single entry point for the workflow: python importers/dispatch.py <id>"""
import sys

def main(tid):
    if tid in ("bhagavata", "ramayana", "mahabharata"):
        mod = __import__(tid); mod.run()
    else:
        import gretil, itx
        if tid in gretil.GRETIL: gretil.run(tid)
        elif tid in itx.ITX:     itx.run(tid)
        else: raise SystemExit(f"unknown text id: {tid}")

if __name__ == "__main__":
    if len(sys.argv) != 2: raise SystemExit("usage: dispatch.py <id>")
    main(sys.argv[1])
