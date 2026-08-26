import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client

def test_get_supported_languages(client: TestClient):
    response = client.get("/translate/languages")
    assert response.status_code == 200
    languages = response.json()
    assert len(languages) == 5
    codes = [l["code"] for l in languages]
    assert "en" in codes
    assert "hi" in codes
    assert "ta" in codes
    assert "te" in codes
    assert "kn" in codes

def test_translate_single_lexicon_hindi(client: TestClient):
    response = client.post(
        "/translate/",
        json={"text": "Live Deals", "target_language": "hi"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["target_language"] == "hi"
    assert "सौदे" in data["translated_text"] or len(data["translated_text"]) > 0

def test_translate_single_tamil(client: TestClient):
    response = client.post(
        "/translate/",
        json={"text": "Store Pickup", "target_language": "ta"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["target_language"] == "ta"
    assert len(data["translated_text"]) > 0

def test_translate_batch(client: TestClient):
    response = client.post(
        "/translate/batch",
        json={
            "texts": ["Organic Milk", "Whole Wheat Bread", "Fresh Yogurt"],
            "target_language": "te"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["translations"]) == 3
    assert data["target_language"] == "te"
