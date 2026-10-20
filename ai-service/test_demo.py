import sys
import unittest
from demo_app import app

class DemoTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_health_explicitly_marks_demo_without_ml(self):
        result = self.client.get('/health').get_json()
        self.assertEqual(result['mode'], 'demo')
        self.assertFalse(result['trained_models'])
        self.assertNotIn('tensorflow', sys.modules)
        self.assertNotIn('torch', sys.modules)

    def test_history_and_forecast_contract(self):
        history = self.client.get('/history/TCS?period=1M').get_json()
        self.assertTrue(history['demo'])
        self.assertEqual(history['rows'], 30)
        self.assertEqual(history['data'][-1]['Close'], 3812)
        forecast = self.client.get('/predict/TCS').get_json()
        self.assertTrue(forecast['demo'])
        self.assertIn(forecast['signal'], ['BUY', 'SELL', 'HOLD'])
        self.assertGreaterEqual(forecast['ai_score'], 0)
        self.assertLessEqual(forecast['ai_score'], 100)
        self.assertEqual(forecast['confidence'], 0)
        self.assertEqual(self.client.get('/predict/UNKNOWN').status_code, 404)

if __name__ == '__main__':
    unittest.main()
