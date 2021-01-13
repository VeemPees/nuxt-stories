---
  title: Fetch examples
  high: 1ere112
  items: 
    - hdr1: val1
    - hdr2
  fetch: 
    csv: /someFile.csv | csv
    json: /someJson.json | json
    more: https://world.openfoodfacts.org/api/v0/product/78742040011.json
    book: https://openlibrary.org/works/OL45883W.json | json
  parsed: 
  lines: 
---

Fetch {{ fetch }}

<b-table-lite :items="fetched.json" />

<p> {{ fetched.book.description.value }} </p>