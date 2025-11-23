from fastapi import FastAPI

app = FastAPI(title="EZBooks Backend")

@app.get("/health")
def health_check():
    return {"status": "ok"}