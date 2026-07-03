from google import genai
import sys

print("Initializing Gemini Client...")
try:
    # Client will attempt to use Application Default Credentials (ADC) automatically
    client = genai.Client()
    print("Client initialized. Sending query...")
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents='Hello! Please reply with exactly "Gemini ADC is working!" if you receive this message.'
    )
    print("\nSuccess! API Response:")
    print(response.text)
except Exception as e:
    print("\nAuthentication or API Error occurred:")
    print(e)
    sys.exit(1)
