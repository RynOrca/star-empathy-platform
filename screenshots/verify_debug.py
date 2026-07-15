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
    page.wait_for_timeout(5000)  # Wait for fetchStories to complete
    
    # Dump tooltip stats cache to debug
    debug = page.evaluate("""
        async () => {
            // Check API response
            const r = await fetch('/api/stars');
            const j = await r.json();
            const star73 = j.data.filter(s => s.catalog_star_id === 73);
            return {
                api_stories_for_73: star73.length,
                api_starry_detail: star73.map(s => ({title: s.title, resonance: s.resonance_count, cid: s.catalog_star_id}))
            };
        }
    """)
    
    with open(r'D:\Code\Working-on-it\star-\screenshots\tooltip_debug3.txt', 'w', encoding='utf-8') as f:
        f.write(str(debug))
    b.close()
