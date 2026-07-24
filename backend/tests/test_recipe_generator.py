import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client

def test_recipe_generator_endpoint(client: TestClient):
    # Call the recipe generator with Bakery and Dairy items
    response = client.post(
        "/products/recipe-generator",
        json={
            "products": [
                {"name": "Whole Wheat Bread", "category": "BAKERY", "quantity": 1},
                {"name": "Cheddar Cheese", "category": "DAIRY", "quantity": 1}
            ]
        }
    )
    assert response.status_code == 200, response.text
    data = response.json()
    
    # Assert top-level fields
    assert "recipe_name" in data
    assert "description" in data
    assert "prep_time" in data
    assert "cook_time" in data
    assert "difficulty" in data
    assert "ingredients" in data
    assert "instructions" in data
    assert "waste_saved_summary" in data
    
    # Assert ingredients structure
    ingredients = data["ingredients"]
    assert len(ingredients) >= 2
    for ing in ingredients:
        assert "name" in ing
        assert "is_deal" in ing
        assert "quantity" in ing
        assert isinstance(ing["is_deal"], bool)
        
    # Assert instructions structure
    instructions = data["instructions"]
    assert len(instructions) >= 2
    for step in instructions:
        assert "step_number" in step
        assert "instruction" in step
        assert isinstance(step["step_number"], int)

def test_recipe_generator_vegetable_fallback(client: TestClient):
    # Call the recipe generator with vegetable Produce items
    response = client.post(
        "/products/recipe-generator",
        json={
            "products": [
                {"name": "Organic Tomatoes", "category": "PRODUCE", "quantity": 2},
                {"name": "Green Salad Lettuce", "category": "PRODUCE", "quantity": 1}
            ]
        }
    )
    assert response.status_code == 200, response.text
    data = response.json()
    
    # Verify fallback recipe has produce-related titles
    assert "Stir Fry" in data["recipe_name"] or "Produce" in data["recipe_name"] or "Harvest" in data["recipe_name"] or "Bowl" in data["recipe_name"]
