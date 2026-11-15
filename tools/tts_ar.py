# Arabic clips in an Egyptian voice (Microsoft "Salma", ar-EG) via the free edge-tts package.
# Sends only the fixed instruction/meaning sentences from data.js; needs internet once, output is offline mp3.
# Usage: python tools/tts_ar.py   (skips files that already exist; delete a file to regenerate it)
import asyncio, json, os, sys
import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE = 'ar-EG-SalmaNeural'

async def main():
    items = json.load(open(os.path.join(ROOT, 'tools', 'audio_src.json'), encoding='utf-8'))
    made = 0
    for it in items:
        if it['lang'] != 'ar':
            continue
        out = os.path.join(ROOT, 'audio', it['key'] + '.mp3')
        if os.path.exists(out):
            continue
        await edge_tts.Communicate(it['text'], VOICE, rate='-10%').save(out)
        made += 1
    print('made', made)

asyncio.run(main())
