"""Browser regression tests. Run: python3 -m unittest discover -s tests -p '*_test.py' -v"""
import functools
import http.server
import os
from pathlib import Path
import threading
import unittest
from playwright.sync_api import sync_playwright


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class ScorerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root = Path(__file__).resolve().parents[1]
        handler = functools.partial(QuietHandler, directory=str(root))
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'), args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 320, 'height': 800})
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.on('dialog', lambda dialog: dialog.accept('1') if dialog.type == 'prompt' else dialog.accept())
        self.page.goto(f'http://127.0.0.1:{self.server.server_port}/')
        self.page.locator('#playersTab').click()
        for i, field in enumerate(self.page.locator('[data-roster]').all()):
            field.fill(f'Test player {i + 1}')
        for selector in ['[data-pair]', '[data-bowler]']:
            for i, field in enumerate(self.page.locator(selector).all()):
                field.select_option(f'Test player {i + 1}')
        self.page.get_by_role('button', name='Save order', exact=True).click()
        self.assertEqual(self.page.locator('#orderStatus').text_content(), 'Players and order saved.', self.errors)
        self.page.locator('#scoringTab').click()

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def run_js(self, code):
        return self.page.evaluate(code)

    def test_scoring_and_wicket_penalty(self):
        self.page.locator('#runButtons button').filter(has_text='4').click()
        self.page.locator('#wicketRuns').select_option('2')
        self.run_js("wicket('Run out')")
        self.assertEqual(self.run_js('stats().runs'), 6)
        self.assertEqual(self.run_js('stats().wickets'), 1)
        self.assertEqual(self.run_js('stats().legal'), 2)
        self.assertEqual(self.page.locator('#net').inner_text(), '201')
        self.assertIn('6 runs', self.page.locator('#batterTable').text_content())

    def test_extras_and_attribution(self):
        self.run_js("extra('wide'); extra('noball'); extra('bye'); extra('legbye')")
        self.assertEqual(self.run_js('stats()'), {'runs': 6, 'legal': 4, 'wickets': 0, 'wides': 2, 'noballs': 2, 'byes': 1, 'legbyes': 1})
        self.assertIn('0 runs', self.page.locator('#batterTable').text_content())
        self.assertIn('4 runs conceded', self.page.locator('#bowlerTable').text_content())

    def test_final_over_requires_six_legal_balls(self):
        self.run_js('for(let i=0;i<66;i++) dot()')
        self.run_js("extra('wide'); extra('noball')")
        self.assertEqual(self.run_js('stats().legal'), 66)
        self.assertEqual(self.run_js('stats().runs'), 4)
        striker = self.page.locator('#striker').input_value()
        self.page.reload()
        self.assertEqual(self.page.locator('#striker').input_value(), striker)
        self.run_js('for(let i=0;i<5;i++) dot()')
        self.run_js("extra('wide')")
        self.assertEqual(self.run_js('stats().legal'), 71)
        self.run_js('dot(); bat(6)')
        self.assertEqual(self.run_js('stats().legal'), 72)
        self.assertEqual(self.run_js('stats().runs'), 6)
        self.run_js('undo()')
        self.assertEqual(self.run_js('stats().legal'), 71)
        self.run_js('bat(4)')
        self.assertEqual(self.run_js('stats().runs'), 10)

    def test_striker_rotation_reload_and_undo(self):
        self.run_js('bat(1)')
        self.assertEqual(self.page.locator('#striker').input_value(), 'Test player 2')
        self.run_js('bat(2)')
        self.assertEqual(self.page.locator('#striker').input_value(), 'Test player 2')
        self.run_js('undo()')
        self.assertEqual(self.page.locator('#striker').input_value(), 'Test player 2')
        self.page.reload()
        self.assertEqual(self.page.locator('#striker').input_value(), 'Test player 2')
        self.run_js('undo()')
        self.assertEqual(self.page.locator('#striker').input_value(), 'Test player 1')
        self.run_js('for(let i=0;i<5;i++) dot(); bat(1)')
        self.assertEqual(self.page.locator('#striker').input_value(), 'Test player 1')
        self.run_js('undo(); dot()')
        self.assertEqual(self.page.locator('#striker').input_value(), 'Test player 2')

    def test_byes_rotate_but_awarded_extras_do_not(self):
        self.run_js("extra('wide'); extra('noball')")
        self.assertEqual(self.page.locator('#striker').input_value(), 'Test player 1')
        self.run_js("extra('bye')")
        self.assertEqual(self.page.locator('#striker').input_value(), 'Test player 2')
        self.run_js("extra('legbye')")
        self.assertEqual(self.page.locator('#striker').input_value(), 'Test player 1')

    def test_pairs_and_bowling_rotation(self):
        self.run_js('for(let i=0;i<24;i++) dot()')
        self.assertEqual(self.page.locator('#striker').input_value(), 'Test player 3')
        # Each team bats once: switching before the first 12 overs is blocked.
        self.page.locator('#inningsSide').select_option('THHG bowling')
        self.assertEqual(self.run_js('stats().legal'), 24)
        self.assertEqual(self.page.locator('#inningsSide').input_value(), 'THHG batting')
        self.run_js('for(let i=0;i<48;i++) dot()')
        self.page.on('dialog', lambda dialog: dialog.accept())
        self.page.locator('#inningsSide').select_option('THHG bowling')
        self.assertEqual(self.run_js('stats().legal'), 0)
        self.assertEqual(self.page.locator('#bowler').input_value(), 'Test player 1')
        self.run_js('for(let i=0;i<36;i++) dot()')
        self.assertEqual(self.page.locator('#bowler').input_value(), 'Test player 1')
        self.run_js('undo()')
        self.assertEqual(self.page.locator('#bowler').input_value(), 'Test player 6')
        self.assertEqual(self.run_js('inningsStats(1).legal'), 72)

    def test_players_persist_and_duplicates_are_rejected(self):
        self.page.reload()
        self.page.locator('#playersTab').click()
        self.assertEqual(self.page.locator('[data-roster="0"]').input_value(), 'Test player 1')
        self.assertEqual(self.page.locator('[data-pair]').first.input_value(), 'Test player 1')
        self.page.locator('#orderDetails').evaluate('(el)=>el.open=true')
        self.page.locator('[data-roster="0"]').fill('<New & player>')
        self.assertEqual(self.page.locator('[data-pair]').first.input_value(), '<New & player>')
        self.page.get_by_role('button', name='Save order', exact=True).click()
        self.page.locator('#scoringTab').click()
        self.assertIn('<New & player>', self.page.locator('#lineupNow').inner_text())
        self.page.locator('#playersTab').click()
        self.page.locator('#orderDetails').evaluate('(el)=>el.open=true')
        self.page.locator('[data-pair]').nth(1).select_option('<New & player>')
        self.page.get_by_role('button', name='Save order', exact=True).click()
        self.assertIn('select each once', self.page.locator('#orderStatus').text_content())

    def test_existing_order_is_migrated_without_changing_scores(self):
        self.run_js("localStorage.removeItem('thhg-players-v1'); bat(3)")
        self.page.reload()
        self.assertEqual(self.run_js('stats().runs'), 3)
        self.page.locator('#playersTab').click()
        self.assertEqual(self.page.locator('[data-roster="5"]').input_value(), 'Test player 6')
        self.assertEqual(self.page.locator('[data-pair]').nth(5).input_value(), 'Test player 6')

    def test_partnership_tiles_advance_at_boundary_and_restore_after_undo(self):
        def tile(label):
            return self.page.locator('.stat-tile').filter(has=self.page.get_by_text(label, exact=True)).locator('strong').text_content()

        self.run_js('for(let i=0;i<23;i++) bat(1)')
        self.assertEqual(tile('Current pair runs'), '23')
        self.run_js('dot()')
        self.assertEqual(tile('Current batting pair'), 'Test player 3 & Test player 4')
        self.assertEqual(tile('Current pair runs'), '0')
        self.assertEqual(tile('Current pair dots'), '0')
        self.assertEqual(tile('Average partnership'), '23.0')
        self.run_js('bat(4)')
        self.assertEqual(tile('Current pair runs'), '4')
        self.assertEqual(tile('Average partnership'), '13.5')
        self.assertEqual(tile('Highest partnership'), '23')
        self.page.reload()
        self.assertEqual(tile('Current pair runs'), '4')
        self.run_js('undo(); undo()')
        self.assertEqual(tile('Current batting pair'), 'Test player 1 & Test player 2')
        self.assertEqual(tile('Current pair runs'), '23')
        self.assertEqual(self.run_js('events[0].pairNames'), ['Test player 1', 'Test player 2'])

    def test_mid_match_order_change_preserves_historical_statistics(self):
        self.run_js('bat(4); dot()')
        before_events = self.run_js('JSON.stringify(events)')
        before_tiles = self.page.locator('#liveStatGrid').inner_text()
        before_scorecard = self.page.locator('#batterTable').text_content()
        self.page.locator('#playersTab').click()
        self.page.locator('#orderDetails').evaluate('(el)=>el.open=true')
        for i, field in enumerate(self.page.locator('[data-pair]').all()):
            field.select_option(f'Test player {(i + 2) % 6 + 1}')
        self.page.get_by_role('button', name='Save order', exact=True).click()
        self.assertEqual(self.page.locator('#orderStatus').text_content(), 'Players and order saved.')
        self.assertEqual(self.run_js('JSON.stringify(events)'), before_events)
        self.assertEqual(self.page.locator('#liveStatGrid').inner_text(), before_tiles)
        self.assertEqual(self.page.locator('#batterTable').text_content(), before_scorecard)
        self.page.reload()
        self.assertEqual(self.page.locator('#liveStatGrid').inner_text(), before_tiles)
        self.assertEqual(self.run_js('JSON.stringify(events)'), before_events)
        self.run_js('bat(2)')
        self.assertEqual(self.run_js('events.at(-1).pairNames'), ['Test player 3', 'Test player 4'])
        self.assertEqual(self.run_js('events[0].pairNames'), ['Test player 1', 'Test player 2'])

    def test_mobile_over_circles_are_evenly_spaced(self):
        for width in [320, 375, 430]:
            self.page.set_viewport_size({'width': width, 'height': 800})
            for screen, graphic in [('scoring', '#currentOverGraphic'), ('live', '#liveOverBalls')]:
                self.run_js(f"showScreen('{screen}')")
                boxes = self.page.locator(graphic + ' .over-ball').evaluate_all('(els)=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})')
                self.assertEqual(len(boxes), 6)
                self.assertLess(max(b['y'] for b in boxes)-min(b['y'] for b in boxes), 1)
                gaps = [boxes[i+1]['x']-boxes[i]['x'] for i in range(5)]
                self.assertLess(max(gaps)-min(gaps), 1)
                for box in boxes:
                    self.assertAlmostEqual(box['w'], box['h'], delta=1)
                self.assertTrue(self.run_js('document.documentElement.scrollWidth <= window.innerWidth'))

    def test_automatic_offline_loading_and_persistence(self):
        self.run_js('bat(4)')
        self.run_js('navigator.serviceWorker.ready')
        self.page.reload()
        self.page.wait_for_function('navigator.serviceWorker.controller !== null')
        self.context.set_offline(True)
        self.page.reload()
        self.assertEqual(self.run_js('stats().runs'), 4)
        self.page.locator('#playersTab').click()
        self.assertEqual(self.page.locator('[data-roster="0"]').input_value(), 'Test player 1')
