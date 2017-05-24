function cancelAdd () {
  window.location.href = '/'
}
function cancelEdit () {
  window.location.href = '/users/view'
}

$(document).ready(function () {

  // Calling function to show/hide html content based on user role
  showRoleBasedData()

  $('#submitBtn').click(function (event) {
    event.preventDefault()

    var fname = $('#f_name').val()
    var email = $('#email').val()
    var pass = $('#password').val()
    var empcode = $('#empcode').val()
    var uploads = $('#uploads').val()

    var error = false

    if (fname === '') {
      error = true
      $('.f_name-error-msg').html(
        "<p>First name can't be empty</p>"
      ).removeClass('hide')
    }

    if (empcode === '') {
      error = true
      $('.empcode-error-msg').html(
        "<p>Employee code can't be empty</p>"
      ).removeClass('hide')
    }

    // Validates email
    error = validateEmail(email)

    if (pass === '') {
      error = true
      $('.password-error-msg').html(
        "<p>Password can't be empty</p>"
      ).removeClass('hide')
    } else if (pass.length < 6) {
      error = true
      $('.password-error-msg').html(
        '<p>Password must be at least 8 characters</p>'
      ).removeClass('hide')
    }

    if (uploads.length) {
      var fileSize = $('#uploads')[0].files[0].size
      var fileData = uploads.split('.')
      var fileExtension = fileData[fileData.length - 1]
      if (!fileExtension.match('(jpg|jpeg|png)')) {
        error = true
        $('.uploads-error-msg').html(
          '<p>Invalid Image extension. Allowed formats are jpg, jpeg and png</p>'
        ).removeClass('hide')
      } else if (fileSize > 2097152) {
        error = true
        $('.uploads-error-msg').html(
          '<p>File size is greater than 2MB is not allowed</p>'
        ).removeClass('hide')
      } else {
        $('.uploads-error-msg').addClass('hide')
      }
    }

    if (!error) $('#userForm').submit()
  })

  $('#category-list').on('change', function () {
    var value = this.value
    if (value === 'createNew') {
      $('#create-category').modal()
      $('#modalSave').click(function (event) {
        event.preventDefault()
        var title = $('#category_name').val()
        var description = $('#category_desc').val()
        if (title !== '' && description !== '') {
          $.ajax({
            type: 'POST',
            url: '/categories/create',
            data: {title: title, description: description},
            cache: false,
            success: function (optionData) {
              if (!optionData.error && optionData.data.html.length) {
                var id = optionData.data.id
                $('#category-list').html(optionData.data.html)
                $('.cat_' + id).attr('selected', true)
                window.alert('success')
              } else {
                $('.cat_default').attr('selected', true)
              }
            },
            error: function (error) {
              console.log('error')
              window.alert('error' + error)
            }
          })
        }
      })
    }
  })
})

/**
 * To show/hide html content based on user role
 */
function showRoleBasedData () {
  httpGet('/rbac/user-role', '', function (responseData) {
    if (responseData.error) {
      window.alert(responseData.message)
    } else {
      var role = responseData.data.role

      // Show respective data in page based on role
      if (role === 'user') {
        $('.user-role').show()
      } else if (role === 'admin') {
        $('.admin-role').show()
      } else {
        window.alert(
          'user role has not assigned, please contact you Administrator'
        )
      }
    }
  })
}

/**
 * To validate email address
 *
 * @param  {string}  email Email to validate
 * @return {boolean} error Error flag
 */
function validateEmail (email) {
  var error = false

  if (email.length === 0) {
    error = true
    // validate-message validate-group
    $('.email-error-msg').html(
      "<p>Email can't be empty</p>"
    ).removeClass('hide')
  } else {
    let atpos = email.indexOf('@')
    let dotpos = email.lastIndexOf('.')
    if (atpos < 1 || dotpos < atpos + 2 || dotpos + 2 >= email.length) {
      error = true
      $('.email-error-msg').html(
        '<p>Please enter a valid e-mail address</p>'
      ).removeClass('hide')
    }
  }

  return error
}

/**
 * Sends HTTP POST request to given url and data and
 * gets the response
 * @param  {string} url
 * @param  {string} data
 * @return {object}
 */
function httpPost (url, data) {
  if (typeof (url) === 'undefined') {
    return {error: true, message: 'Url is undefined'}
  }

  if (typeof (data) === 'undefined') {
    return {error: true, message: 'data is undefined'}
  }

  if (!isJson(data)) {
    return {error: true, message: 'data is not a JSON object'}
  }

  $.ajax({
    type: 'POST',
    url: url,
    data: data,
    cache: false,
    success: function (responseData) {
      if (isJson(responseData)) {
        if (responseData.error === 'undefined' ||
            responseData.error === null
        ) {
          return {
            error: true,
            message: 'Error data is null or undefined in response JSON'
          }
        } else {
          return responseData
        }
      } else {
        return {
          error: true,
          message: 'Response data is not a JSON object'
        }
      }
    },
    error: function (error) {
      return {
        error: true,
        message: error
      }
    }
  })
}

/**
 * Sends HTTP GET request to given url and data and
 * gets the response
 * @param  {string} url
 * @param  {string} data
 * @return {object}
 */
function httpGet (url, data = '', responseCallback) {
  if (typeof (url) === 'undefined') {
    return responseCallback({
      error: true,
      message: 'Url is undefined'
    })
  }

  if (typeof (data) === 'undefined') {
    return responseCallback({
      error: true,
      message: 'data is undefined'
    })
  }

  if (data.length && !isJson(data)) {
    return responseCallback({
      error: true,
      message: 'data is not a JSON object'
    })
  }

  $.ajax({
    type: 'GET',
    url: url,
    data: data,
    cache: false,
    success: function (responseData) {
      if (isJson(responseData)) {
        if (responseData.error === 'undefined' ||
            responseData.error === null
        ) {
          return responseCallback({
            error: true,
            message: 'Error data is null or undefined in response JSON'
          })
        } else {
          return responseCallback(responseData)
        }
      } else {
        return responseCallback({
          error: true,
          message: 'Response data is not a JSON object'
        })
      }
    },
    error: function (error) {
      return responseCallback({
        error: true,
        message: error
      })
    }
  })
}

/**
 * To Check if a given data is JSON data or not
 * @param  {*}       item
 * @return {boolean}
 */
function isJson (item) {
  item = typeof item !== 'string'
      ? JSON.stringify(item)
      : item

  try {
    item = JSON.parse(item)
  } catch (e) {
    return false
  }

  if (typeof item === 'object' && item !== null) {
    return true
  }

  return false
}
