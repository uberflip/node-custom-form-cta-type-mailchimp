var express = require('express')
var bodyParser = require('body-parser')
var pkg = require('./package')
var mcapi = require('mailchimp-api')

var port = process.env.PORT
if (!port) {
  console.error('Error: The PORT environment variable is not set.')
  process.exit(1)
}

var apiKey = process.env.API_KEY
if (!apiKey) {
  console.error('Error: The API_KEY environment variable is not set.')
  process.exit(1)
}

var mc = new mcapi.Mailchimp(apiKey)
var app = express()
var config = pkg.config

app.use(bodyParser.json())

app.get('/', function (req, res) {
  res.send(pkg.name + ' listening on ' + port)
})

app.post('/cta-get-fields', function (req, res) {
  mc.lists.mergeVars({
    id: [ config.listId ]
  }, function (data) {
    var fields = []
    data.data[0].merge_vars.forEach(function (mergeVar) {
      var field = {
        'display_name': mergeVar.name,
        'html_name': mergeVar.tag,
        'data_type': 'text',
        'required': mergeVar.req,
        'active': mergeVar.show,
        'locked': false
      }

      if (mergeVar.field_type === 'radio' || mergeVar.field_type === 'dropdown') {
        field.control_type = 'select'
      } else {
        field.control_type = 'text'
      }

      if (field.control_type === 'select') {
        field.values = []
        mergeVar.choices.forEach(function (choice) {
          field.values.push({
            'label': choice,
            'value': choice
          })
        })
      }
      fields.push(field)
    })
    res.json(fields)
    res.status(200)
    res.end()
  }, function (error) {
    if (error.error) {
      res.json({'errors': [{'message': error.error, 'code': error.code}]})
    }
    res.status(500)
    res.end()
  })
})

app.post('/cta-submitted', function (req, res) {
  mc.lists.subscribe({
    id: config.listId,
    email: {
      email: req.body.submission.fields.EMAIL
    },
    merge_vars: req.body.submission.fields,
    double_optin: false
  }, function (data) {
    res.status(200)
    res.end()
  }, function (error) {
    if (error.error) {
      res.json({'errors': [{'message': error.error, 'code': error.code}]})
    }
    res.status(500)
    res.end()
  })
})

app.listen(port, function () {
  console.log(pkg.name + ' listening on port ' + port)
})
