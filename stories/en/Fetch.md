---
  title: Fetch examples
  fetch: 
    csv: /someFile.csv | csv
    someJson: /someJson.json | json
    foodFacts: https://world.openfoodfacts.org/api/v0/product/3159470000120.json | json
    book: https://openlibrary.org/works/OL258902W.json | json 
---
<button class="btn btn-primary" v-on:click="fmFetch()">Refresh</button>

Some csv:
<b-table-lite :items="fetched.csv" />

Some Json:
<b-table-lite :items="fetched.someJson" />

<img :src="fetched.foodFacts.product.image_front_url" />

<p> {{ fetched.book.description.value }} </p>

