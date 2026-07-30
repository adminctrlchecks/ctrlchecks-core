# Architecture Documentation

Written by reading source, config and CI definitions in this repository — not from other
documentation. Claims that could not be verified from the repo are marked **[UNVERIFIED]**
rather than guessed.

| Document | Read it for |
|---|---|
| [SYSTEM-ARCHITECTURE.md](./SYSTEM-ARCHITECTURE.md) | What the system actually is: components, request flow, data layer, and the known divergences found during analysis |
| [SERVICES.md](./SERVICES.md) | Per-process reference — routes, ports, what each service really owns |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Local `dev-start-all` stack vs Hostinger systemd production, and how to confirm live state |
| [MICROSERVICES-READINESS.md](./MICROSERVICES-READINESS.md) | Whether SaaS needs microservices, where the real gaps are, and an ordered path if you want them |

## The three facts that shape everything else

1. **`worker/` is the system.** 1,572 files, 360 routes, and the only copy of the node
   registry. The other six services own no part of the domain model.
2. **All seven share one database.** Same host, same schema. This is why the architecture is
   a distributed monolith rather than microservices, and why a migration is a coordinated
   release of everything.
3. **Every delegation has a silent in-process fallback.** A service being down is not an
   error — it is an invisible change of code path. Verify which processes are up before
   trusting a local reproduction.

## Verify before relying

Nothing here proves what runs on Hostinger. `DEPLOYMENT.md` §4 lists the commands that would
confirm it — in particular whether `AI_GENERATOR_URL` and friends are set in production,
which determines whether the six services receive any traffic at all.
