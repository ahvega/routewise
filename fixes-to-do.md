# Comments to more recent revisions

## 1. Quotations – Detail View (`quotations/`)

### 1.1. Date fields (Fecha)

* If the quotation **is accepted**:

  * Do **not** show the expiration date field.
* If the quotation **is not yet accepted**:

  * Show the expiration date field.
  * The label of this field must be:
    **`Expiration / Expiración`**

### 1.2. “Estimación de Costos” box

* Add a **USD values column**:

  * Each cost line should show its value in USD in a separate column.
* Show lines as **accordions**:

  * Each line should be collapsible/expandable.
  * When expanded, it must show the detailed breakdown that was requested (same structure as previously defined, just make sure the accordion behavior works).

---

## 2. Quotations – New (`quotations/new`)

### 2.1. After “Calcular Ruta”

* **Tiempo Estimado**:

  * Show the **estimated time per leg**, not just a total.
  * Format example:
    `Origen -> Destino   1h 48m   93 km`
  * Each leg should show its own duration and distance.

* **Distancia Total and extra km text**:

  * The total distance currently seems to already include the extra kilometers.
  * Do **not** show `" + 100 km extra"` before the value, because that suggests the extra is on top of what is shown.
  * Instead, use text like:
    `Incluye 100 km extra`
  * Clarify whether the extra kilometers are:

    * **Per day**, or
    * **Total for the whole service**
      (Use the appropriate wording in the UI based on the business rule.)

### 2.2. Vehicle Selection (“Selección de Vehículo”)

* **Costs per day / per km**:

  * Do **not** round values.
  * Show all costs with **2 decimal places**.
  * Applies to:

    * Cost per day
    * Cost per km
    * Any other monetary values shown in this section

### 2.3. Local currency rounding (redondeo)

* Make sure the **local currency rounding rule** is applied **only** to the **final prices shown in the quotation**:

  * Internal calculations can keep full precision.
  * The final totals shown to the user should reflect the local rounding logic we agreed on.

---

## 3. Vehicles – Edit Form (`vehicles/`)

### 3.1. Make/Brand and Model behavior

* The system should use a **global list of vehicle brands** and, within each brand, a **list of models**.

* Suggested implementation:

  * A JSON or similar structure like:

    ```json
    {
      "Toyota": ["Hilux", "Coaster", "Corolla"],
      "Hyundai": ["H1", "County"],
      ...
    }
    ```

* In the **vehicles edit form**:

  * The **Marca (brand)** field should be a select filled from this global list.
  * The **Modelo (model)** field should:

    * Only show models that belong to the selected brand.
    * Update its options when the brand changes.

* Current issue to fix:

  * When editing an existing vehicle:

    * The brand select only shows the **saved value**, instead of the full list.
    * The same happens with the model select.
  * Fix this so the user can change both the brand and model from the complete list.

---

## 4. Dashboard – “Actividad reciente”

* Current behavior:

  * Shows **status changes** in documents (e.g. quotations, invoices, etc.).
* Open question (for product/PO, but useful to note in code comments):

  * Would it be useful to also **log and show document deletions** here?

    * If yes, we should:

      * Record deletion events.
      * Display them in the Actividad reciente list with a clear label (e.g. “Cotización eliminada”, “Factura eliminada”).

For now, just keep in mind this might become an enhancement.

---

## 5. Invoices, Quotations, Itineraries, Payments – Data Integrity

### 5.1. Deletion rules

The system must **protect data integrity** by preventing unsafe deletions:

* **Itineraries**:

  * Do **not** allow deleting an itinerary if it has **invoices** associated with it.

* **Quotations**:

  * Do **not** allow deleting a quotation if there is an **itinerary** linked to it.

* **Invoices with payments**:

  * Do **not** allow deleting invoices that have **payments** associated.

### 5.2. Admin override (deletion order)

* **Admins** should still be able to completely remove documents, but **in the correct order**:

  1. First delete **payments**.
  2. Then delete the **invoice**.
  3. Then delete the **itinerary**.
  4. Finally delete the **quotation**.
* Enforce this by:

  * Validating relationships before deletion.
  * Showing a clear error message if the user tries to delete out of order.

---

## 6. Invoices – Status “Cancelada” → “Anulada”

* Rename the invoice status:

  * Change label **`Cancelada`** to **`Anulada`** everywhere it appears in the UI.
* Permissions:

  * Only **system admin users** should be allowed to change an invoice status to **Anulada**.
  * Non-admin users:

    * Can view the status.
    * Cannot set or change an invoice to Anulada.

## **Checklist of tasks:**

## ✅ 1. Quotations – Detail View (`quotations/`)

### 1.1. Date fields (Fecha)

* [ ] When quotation **is accepted**, hide expiration date field.
* [ ] When quotation **is not accepted**, show expiration date field.
* [ ] Set label text to: **`Expiration / Expiración`**.
* [ ] Make sure logic is based on the correct quotation status field.

### 1.2. “Estimación de Costos” box

* [ ] Add a **USD values** column to the table/list.
* [ ] Ensure each row shows the correct USD amount.
* [ ] Implement each cost line as an **accordion** (collapsible row).
* [ ] On expand, show detailed breakdown as requested (items, sub-costs, etc.).
* [ ] Check that all accordions work correctly on desktop and mobile.

---

## ✅ 2. Quotations – New (`quotations/new`)

### 2.1. After “Calcular Ruta”

* [ ] For **Tiempo Estimado**, show **per leg**, not only total.
* [ ] Use a format like: `Origen -> Destino   1h 48m   93 km`.
* [ ] Confirm that each leg has separate time and distance from the route calculation.
* [ ] In **Distancia Total**, verify if total already includes extra km.
* [ ] Remove “+ 100 km extra” style wording if misleading.
* [ ] Change wording to something like: `Incluye 100 km extra`.
* [ ] Indicate clearly if extra km are **per day** or **total** (match business rule).

### 2.2. Vehicle Selection (“Selección de Vehículo”)

* [ ] Show **cost per day** with 2 decimals (e.g. `123.45`).
* [ ] Show **cost per km** with 2 decimals.
* [ ] Show any other monetary values here with 2 decimals.
* [ ] Make sure there is no rounding to whole numbers in this step.

### 2.3. Local currency rounding (redondeo final)

* [ ] Keep full precision in internal calculations.
* [ ] Apply **local currency rounding** only to final totals shown in the quotation.
* [ ] Verify that the final shown price respects the agreed rounding rule.
* [ ] Check that PDFs/emails (if any) use the same final rounded values.

---

## ✅ 3. Vehicles – Edit Form (`vehicles/`)

### 3.1. Make/Brand and Model behavior

* [ ] Create or use a **global list** of brands with models, e.g. JSON:

  * [ ] Something like:

    ```json
    {
      "Toyota": ["Hilux", "Coaster", "Corolla"],
      "Hyundai": ["H1", "County"]
    }
    ```

* [ ] Populate **Marca** select with the full list of brands.
* [ ] When a brand is selected, populate **Modelo** select with models for that brand.
* [ ] When editing an existing vehicle:

  * [ ] Preselect the saved brand, but still show all brands in the dropdown.
  * [ ] Preselect the saved model, but still show all models for that brand.
* [ ] Fix current bug where brand and model selects only show the current value.
* [ ] Test creating a new vehicle and editing an existing one to confirm behavior.

---

## ✅ 4. Dashboard – “Actividad reciente”

*(This is partly a product question, but dev can prepare for it.)*

* [ ] Confirm if deletions should be logged (ask PO/product).
* If **yes**:

  * [ ] Log document deletion events (quotations, itineraries, invoices, etc.).
  * [ ] Store who deleted, what document, and when.
  * [ ] Show deletions in “Actividad reciente” with a clear label (e.g. “Factura eliminada”).
  * [ ] Make sure the feed still shows status changes as it does now.

---

## ✅ 5. Data Integrity – Deletion Rules

### 5.1. Prevent unsafe deletions

* [ ] Block deletion of **itineraries** that have **invoices** attached.
* [ ] Block deletion of **quotations** that have an **itinerary** linked.
* [ ] Block deletion of **invoices** that have **payments** linked.
* [ ] Show a clear error message when deletion is blocked (explain why).

### 5.2. Admin deletion flow (order)

For admin users:

* [ ] Allow deleting **payments**.
* [ ] After payments are removed, allow deleting the **invoice**.
* [ ] After invoice is removed, allow deleting the **itinerary**.
* [ ] After itinerary is removed, allow deleting the **quotation**.
* [ ] Enforce this order via checks in the backend (not only in UI).
* [ ] Confirm non-admin users still cannot bypass these rules.

---

## ✅ 6. Invoices – Status “Cancelada” → “Anulada”

* [ ] Rename invoice status “Cancelada” to “Anulada” everywhere in UI.
* [ ] Ensure underlying status code/value is handled correctly (if changed).
* [ ] Restrict **changing status to “Anulada”** to admin users only.
* [ ] Non-admin users:

  * [ ] Must **not** see the action/button to set “Anulada”.
* [ ] Test:

  * [ ] Admin can change status to Anulada.
  * [ ] Non-admin cannot.
  * [ ] Anulada invoices display correctly in lists, details, and reports.
