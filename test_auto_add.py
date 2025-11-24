import requests

url = "http://localhost:8000/receipts/"
files = {'file': ('test_receipt.txt', b'dummy content', 'text/plain')}
data = {
    'vendorId': 'Auto Vendor',
    'amount': '10.00',
    'taxAmount': '1.00',
    'date': '2023-01-01'
}

response = requests.post(url, files=files, data=data)
print(response.json())
