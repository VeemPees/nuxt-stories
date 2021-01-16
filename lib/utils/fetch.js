import csvParse from 'csv-parse/lib/sync'
import { parseStringPromise as parseXML } from 'xml2js'

const transformers = {
  csv: (res) => res.text().then(csvIn => csvParse(csvIn, { columns: true })),
  text: (res) => res.text(),
  json: (res) => res.json(),
  xml: (res) => res.text().then(parseXML)
}

export default Object.freeze({
  /**
   * Info can either be in the following formats:
   * 1) Object (values are the urls, keys represent the names to store in)
   * (alternate formats planned)
   * 
   * If the value contains a "|" the string will be split and the 
   * left substring will be the url, the right substring will be one of the
   * transformers to use: "text", "json", "csv" or "xml"
   * 
   * @param {object} info
   * @param {function} notify 
   */
  fetch(info, notify) {
    Object.entries(info).forEach(([key, val]) => {
      if (!val) return
      const parts = val.split(/\s*\|\s*/)
      const fetchUrl = parts[0]
      const transform = parts[1] || 'text'
      fetch(fetchUrl)
      .then(transformers[transform])
      .then(resp => notify(key, resp))
    })
  }
})
