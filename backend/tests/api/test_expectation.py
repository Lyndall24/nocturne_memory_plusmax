"""Tests for /expectation API endpoints.

These tests are written before the implementation (TDD).
Run them first to verify they FAIL with 404 (route not found).
"""
import pytest


async def test_get_expectation_returns_defaults_when_not_set(api_client):
    response = await api_client.get("/expectation/session-abc")

    assert response.status_code == 200
    payload = response.json()
    assert payload["session_id"] == "session-abc"
    assert payload["intensity"] == 1
    assert payload["dependency"] == 1
    assert payload["expression"] == 1


async def test_post_expectation_persists_and_returns_updated_values(api_client):
    response = await api_client.post(
        "/expectation/session-xyz",
        json={"intensity": 2, "dependency": 0, "expression": 1, "note": "继续项目A"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["intensity"] == 2
    assert payload["dependency"] == 0
    assert payload["note"] == "继续项目A"


async def test_post_expectation_is_idempotent_upsert(api_client):
    await api_client.post("/expectation/session-xyz", json={"intensity": 2})
    response = await api_client.post("/expectation/session-xyz", json={"intensity": 0})

    assert response.status_code == 200
    assert response.json()["intensity"] == 0


async def test_get_expectation_reflects_previously_posted_values(api_client):
    await api_client.post(
        "/expectation/session-persist",
        json={"intensity": 2, "dependency": 2, "expression": 0},
    )

    response = await api_client.get("/expectation/session-persist")
    payload = response.json()

    assert payload["intensity"] == 2
    assert payload["dependency"] == 2
    assert payload["expression"] == 0


async def test_delete_expectation_resets_to_defaults(api_client):
    await api_client.post("/expectation/session-del", json={"intensity": 2})
    del_response = await api_client.delete("/expectation/session-del")
    assert del_response.status_code == 200

    get_response = await api_client.get("/expectation/session-del")
    assert get_response.json()["intensity"] == 1  # back to default


async def test_post_expectation_rejects_out_of_range_values(api_client):
    response = await api_client.post(
        "/expectation/session-bad",
        json={"intensity": 5},
    )
    assert response.status_code == 422
