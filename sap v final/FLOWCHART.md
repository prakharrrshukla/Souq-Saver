# Souq Saver v2: flowchart in chronological order

How one request moves through SAP V2, from the moment the user types to the moment the cart is
ready. GitHub draws the diagrams below automatically (Mermaid). The numbers in the example come from
the sample household Leonardo DiCappuccino; they change with the household and the request.

## 1. The parts

```mermaid
flowchart TD
    U["User types any request<br/>5 languages"] --> W["Web chat<br/>React, unchanged from v1"]
    W --> O["Orchestrator agent<br/>gpt-oss-120b on AWS Bedrock"]
    O --> M["MCP client with guards<br/>Home coordinates, checkout blocked,<br/>read-only retry, no mutating retry"]
    M --> C[("Careem MCP<br/>local sandbox, sample households")]
    O --> A["AI household engine<br/>gpt-oss-120b on AWS Bedrock"]
    A <--> K["Calculator<br/>code: prices, fees, budget, rules"]
    W -->|Approve button| G["Approval gate<br/>one-time token"]
    G --> M
    O -.->|every step| X["X-ray log"]

    classDef ai fill:#EEEDFE,stroke:#534AB7,color:#26215C
    classDef careem fill:#E1F5EE,stroke:#0F6E56,color:#04342C
    classDef code fill:#F1EFE8,stroke:#5F5E5A,color:#2C2C2A
    class O,A ai
    class C careem
    class W,M,K,G,X code
```

## 2. One request, step by step

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as Web chat
    participant Orch as Orchestrator (AI)
    participant MCP as Careem MCP (sandbox)
    participant AI as AI household engine
    participant Calc as Calculator (code)
    participant Gate as Approval gate

    rect rgb(241, 239, 232)
    Note over User,Web: Phase 1. The user asks
    User->>Web: "Same as last week, but cut 15%" (or any request, any of 5 languages)
    Web->>Orch: message + session
    Orch->>Orch: understands it: budget or cut %, keep, add, drop
    end

    rect rgb(225, 245, 238)
    Note over Orch,MCP: Phase 2. Read the household's raw data from Careem
    Orch->>MCP: user_info (with Home coordinates)
    MCP-->>Orch: name, saved addresses
    Orch->>MCP: get_activities (past groceries, past shops)
    MCP-->>Orch: every order: items, quantities, prices, dates, store
    Orch->>MCP: groceries_get_items_details (batches of 20, per store)
    MCP-->>Orch: category, size, product id per item
    end

    rect rgb(238, 237, 254)
    Note over Orch,AI: Phase 3. The AI learns the household
    Orch->>Calc: purchase gaps in days, days since last purchase
    Calc-->>Orch: plain arithmetic, no judgement
    Orch->>AI: every product's purchase history + those facts
    AI->>AI: likes and brand loyalty (e.g. always Royal Mahal rice)
    AI->>AI: dislikes (tried once, dropped) and switches (cow milk to oat milk)
    AI->>AI: due this week or not, ignoring bulk buys, guest weeks, holidays
    AI->>AI: priority tier T1 water to T5 treats, usual quantity
    AI-->>Orch: needs list with evidence for every product
    end

    rect rgb(225, 245, 238)
    Note over Orch,MCP: Phase 4. Check every store
    Orch->>MCP: search_groceries_items (Careem Quik)
    Orch->>MCP: global_search (Careem Shops supermarkets)
    Orch->>MCP: search_groceries_items + cart_get_basket_price per Shops store
    MCP-->>Orch: each store's prices, delivery and service fees
    Orch->>Calc: price the whole needs list at every store
    Calc-->>Orch: store totals, missing items, which stores lack essentials
    end

    rect rgb(238, 237, 254)
    Note over Orch,Calc: Phase 5. The AI builds the basket, the calculator checks it
    Orch->>AI: needs + store options + budget (e.g. AED 158.23)
    loop up to 3 tries
        AI->>AI: one store, cut treats first, swap only if not brand-loyal, then reduce
        AI->>Calc: proposed basket
        alt plan breaks a rule or is over budget while something can still be cut
            Calc-->>AI: rejected, with every reason (e.g. "loyal product, do not swap")
        else plan is valid
            Calc-->>AI: accepted, exact total (or an honest shortfall)
        end
    end
    AI-->>Orch: checked basket + a note for every item
    Orch->>Calc: final store comparison and monthly saving estimate
    Orch-->>Web: basket, reasons, store comparison, one-time approval token
    Web-->>User: reply in the user's language + "Nothing has been charged"
    end

    rect rgb(250, 238, 218)
    Note over User,Gate: Phase 6. Only the Approve button can touch a cart
    User->>Web: presses Approve
    Web->>Gate: approval token
    Gate->>Gate: valid, unused, same session and plan, under 15 minutes? Burn it
    Gate->>MCP: create_grocery_cart_with_quantities (the only mutating call, never retried)
    MCP-->>Gate: basket created
    Gate->>MCP: cart_get_basket_price
    MCP-->>Gate: fees + best promo applied by Careem
    Gate->>Calc: exact final price
    Calc-->>Web: cart ready
    Web-->>User: cart ready at the chosen store. Checkout is never called
    end
```

## 3. Safety rules on the way (Careem's "Ship it safely")

```mermaid
flowchart LR
    R["Any Careem tool call"] --> Q1{"Checkout?"}
    Q1 -->|yes| B1["Blocked, always"]
    Q1 -->|no| Q2{"Mutating?<br/>(not marked read-only)"}
    Q2 -->|no| RO["Run it<br/>retry once if it fails"]
    Q2 -->|yes| Q3{"Valid one-time grant<br/>from the Approve button?"}
    Q3 -->|no| B2["Blocked, never reaches Careem"]
    Q3 -->|yes| MU["Run it once<br/>never retried"]

    classDef stop fill:#FCEBEB,stroke:#A32D2D,color:#501313
    classDef go fill:#EAF3DE,stroke:#3B6D11,color:#173404
    class B1,B2 stop
    class RO,MU go
```

## What is AI and what is code

| Step | Done by |
|---|---|
| Understanding the request | AI (orchestrator) |
| Learning the household: likes, dislikes, switches, what is due, tiers | AI (household engine) |
| Choosing the store, cuts, swaps and quantities | AI (household engine) |
| Purchase gaps, every price, fee, total, budget and saving | Calculator (code) |
| Rejecting a plan that breaks the household's rules | Calculator (code) |
| Approving and building the cart | The user, through the Approve button |
