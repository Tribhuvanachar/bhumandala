"""Single entry point for the workflow: python importers/dispatch.py <id>"""
import sys

# id -> (module, run-callable name) for the commentary/word-meaning importers
COMMENTARY = {
    "ramayana_saartha": ("ramayana_saartha", "run"),
    "mahabharata_ganguli": ("mahabharata_ganguli", "run"),
    "bhagavad_gita": ("bhagavadgita", "run"),
    "shankara_bhashya": ("shankara_bhashya", "run"),
}

def main(tid):
    if tid in ("bhagavata", "ramayana", "mahabharata"):
        mod = __import__(tid); mod.run()
    elif tid in COMMENTARY:
        modname, fn = COMMENTARY[tid]
        mod = __import__(modname); getattr(mod, fn)()
    else:
        import gretil, itx, darshana_gretil
        if tid in gretil.GRETIL: gretil.run(tid)
        elif tid in darshana_gretil.DARSHANA_GRETIL: darshana_gretil.run(tid)
        elif tid in itx.ITX:     itx.run(tid)
        else: raise SystemExit(f"unknown text id: {tid}")

if __name__ == "__main__":
    if len(sys.argv) != 2: raise SystemExit("usage: dispatch.py <id>")
    main(sys.argv[1])
