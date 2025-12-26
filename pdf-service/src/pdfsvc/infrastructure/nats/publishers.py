from __future__ import annotations

from dataclasses import dataclass
from faststream.nats import NatsBroker


@dataclass(frozen=True)
class EventPublisher:
    broker: NatsBroker

    async def publish(self, subject: str, payload: dict) -> None:
        await self.broker.publish(payload, subject=subject)
