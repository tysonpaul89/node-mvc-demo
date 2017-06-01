
// Categories list functionality

exports.createCategory = function (req, res, next) {
  let domain = req.app.locals.Domain
  let sequelize = req.app.locals.sequelize
  domain.findAll({
    attributes: [[sequelize.fn('COUNT', sequelize.col('domain_id')), 'domainCount']]
  }).then(function (allDomainData) {
    // console.log('domainCount =' + JSON.stringify(allDomainData))
  })

  let page = (req.params.page) ? req.params.page : 1
  let limit = 3
  let offset = (page - 1) * limit

  domain.findAndCountAll({
    attribute: ['domain', 'domain_id', 'description', 'status'],
    offset: offset,
    limit: limit,
    order: [['domain_id', 'DESC']]
  }).then(function (result) {
    // console.log('domainCount =' + JSON.stringify(result))
    if (result) {
      let html = generateOptions(result.rows)
      console.log('html' + html)
      res.render('categories/create', {

        html: html,
        allDomain: result.rows,
        totalCount: result.count,
        offset: offset,
        limitCount: limit,
        page: page
      })
    } else {
      req.app.locals.logger.error('Domain is empty')
      next()
    }
  })
}

exports.saveCategory = function (req, res, next) {
  let dashboard = require('../models/Dashboard')
  let domain = req.app.locals.Domain
  let data = {
    domain: req.body.title,
    description: req.body.description
  }

  req.app.locals.Domain.create(data).then(function (domainData) {
    // Trigger event in front end to update dashboard counts
    dashboard.getCounts(req, res, next)

    domain.findAll({
      attribute: 'domain'
    }).then(function (allDomain) {
      let allDomainHtml = '<option class="cat_default" value="">' +
        '--Select category--</option>' +
        generateOptions(allDomain) +
        '<option class="cat_new" value="createNew">' +
        '--Create new--</option>'

      res.json({error: false,
        data: {
          id: domainData.domain_id,
          html: allDomainHtml
        }})
    })
  })
}

exports.getSubCategory = function (req, res, next) {
  let Subdomain = req.app.locals.Subdomain

  req.getConnection(function (err, connection) {
    let html = ''
    Subdomain.findAll({
      attribute: [ 'sub_domain_id', 'subdomain', 'description', 'domain_id' ],
      where: {
        domain_id: req.body.categoryId
      }
    }).then(function (subDomains) {
      subDomains.forEach(function (element) {
        html += '<option ' +
        'class="sub_cat_' + element.sub_domain_id + '"' +
        ' value=' + element.sub_domain_id + '>' +
        element.sub_domain + '</option>'
      })
      if (req.body.categoryId !== '-1') {
        html += '<option class="sub_cat_new" value="createNewSub">' +
          '--Create new--</option>'
      }

      res.json({error: false,
        data: {
          html: html
        }})
    })
  })
}

exports.saveSubCategory = function (req, res, next) {
  req.getConnection(function (err, connection) {
    var data = {
      sub_domain: req.body.subCategory,
      description: req.body.description,
      domain_id: req.body.domain_id
    }

    req.app.locals.Subdomain.create(data).then(function (subDomainData) {
      let subdomain = req.app.locals.Subdomain
      subdomain.findAll({
        attribute: 'sub_domain',
        where: {
          domain_id: req.body.domain_id
        }
      }).then(function (allSubDomain) {
        let allSubDomainHtml = '<option class="sub_cat_default" value="-1">' +
          '--Select category--</option>'

        allSubDomain.forEach(function (element) {
          allSubDomainHtml += '<option ' +
            'class="sub_cat_' + element.sub_domain_id + '"' +
            ' value=' + element.sub_domain_id + '>' +
            element.sub_domain + '</option>'
        })
        allSubDomainHtml += '<option class="sub_cat_new" value="createNew">' +
          '--Create new--</option>'

        res.json({error: false,
          data: {
            id: subDomainData.sub_domain_id,
            html: allSubDomainHtml
          }})
      })
    })
  })
}

exports.changeToApprove = function (req, res, next) {
  var domainId = req.params.domain_id
  let domain = req.app.locals.Domain
  console.log('allDomin =' + domainId)

  domain.update({
    status: 1
  }, {
    where: {
      domain_id: domainId
    }
  }).then(function (updateResult) {
    console.log(updateResult)
  })

  res.redirect('/categories/create')
}

exports.changeToReject = function (req, res, next) {
  var domainId = req.params.domain_id
  let domain = req.app.locals.Domain
  console.log('allDomin =' + domainId)

  domain.update({
    status: 0
  }, {
    where: {
      domain_id: domainId
    }
  }).then(function (updateResult) {
    console.log(updateResult)
  })

  res.redirect('/categories/create')
}

// exports.list = function (req, res, next) {

//   res.render('/categories/list')
// }



function generateOptions (optionData) {
  // console.log('optData' + JSON.stringify(optionData))
  let html = ''
  if (optionData.length) {
    optionData.forEach(function (element) {
      html += '<option ' +
        'class="cat_' + element.domain_id + '"' +
        ' value=' + element.domain_id + '>' +
        element.domain + '</option>'
    })
  } else if (typeof (optionData) === 'object') {
    html += '<option ' +
      'class="cat_' + optionData.domain_id + '"' +
      ' value=' + optionData.domain_id + '>' +
      optionData.domain + '</option>'
  }

  return html
}
