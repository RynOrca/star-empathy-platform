from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={'width':1280,'height':800})
    import requests
    r = requests.post('http://localhost:3000/api/auth/guest')
    token = r.json()['data']['token']
    page.goto('http://localhost:5173/', wait_until='networkidle', timeout=15000)
    page.evaluate(f"localStorage.setItem('token','{token}')")
    page.goto('http://localhost:5173/sky', wait_until='networkidle', timeout=15000)
    page.wait_for_timeout(4000)
    
    canvas = page.locator('canvas')
    box = canvas.bounding_box()
    for y in range(int(box['y']), int(box['y'] + box['height']), 30):
        for x in range(int(box['x']), int(box['x'] + box['width']), 30):
            page.mouse.move(x, y)
    
    page.wait_for_timeout(500)
    
    result = page.evaluate("""
        () => {
            const all = document.querySelectorAll('div');
            for (const d of all) {
                if (d.style.marginTop === '1rem' && d.style.backdropFilter) {
                    return 'FOUND: opacity=' + d.style.opacity + ' inner=' + d.innerHTML.substring(0, 100);
                }
            }
            return 'NOT FOUND among ' + all.length + ' divs';
        }
    """)
    
    with open(r'D:\Code\Working-on-it\star-\screenshots\tooltip_debug.txt', 'w', encoding='utf-8') as f:
        f.write(str(result))
    b.close()
