from __future__ import annotations

from faststream.nats import NatsBroker


def create_broker(nats_url: str) -> NatsBroker:
    broker = NatsBroker(nats_url)
    return broker
