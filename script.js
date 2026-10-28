window.addEventListener('DOMContentLoaded', function () {

  // Бэкенд FormSubmit: письмо с формой приходит на указанную почту.
  // При самой первой отправке на почту придёт письмо с кнопкой активации.
  var RECIPIENT_EMAIL = 'milokhin_danya@internet.ru';
  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/' + RECIPIENT_EMAIL;

  var STORAGE_KEY = 'feedbackFormData';
  var POPUP_HASH = '#feedback';

  var popup = document.getElementById('popup');
  var openButton = document.getElementById('open-form');
  var closeButton = document.getElementById('close-form');
  var form = document.getElementById('feedback-form');
  var submitButton = document.getElementById('submit-button');
  var messageElement = document.getElementById('form-message');
  var firstField = document.getElementById('f-name');

  var fieldNames = ['name', 'email', 'phone', 'organization', 'message'];

  // В поле ФИО разрешены только буквы, пробел и дефис.
  function keepOnlyLetters(value) {
    return value.replace(/[^\p{L}\s\-]/gu, '');
  }

  firstField.addEventListener('input', function () {
    var cleaned = keepOnlyLetters(firstField.value);
    if (cleaned !== firstField.value) {
      firstField.value = cleaned;
    }
  });

  // В поле телефона нельзя вводить буквы: только цифры, пробел, + ( ) и дефис.
  var phoneField = document.getElementById('f-phone');

  function keepPhoneChars(value) {
    return value.replace(/[^0-9+\s()\-]/g, '');
  }

  phoneField.addEventListener('input', function () {
    var cleaned = keepPhoneChars(phoneField.value);
    if (cleaned !== phoneField.value) {
      phoneField.value = cleaned;
    }
  });

  // ----- LocalStorage -----

  function saveFormData() {
    var data = {};
    fieldNames.forEach(function (fieldName) {
      data[fieldName] = form.elements[fieldName].value;
    });
    data.agree = form.elements.agree.checked;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.log('localStorage недоступен', error);
    }
  }

  function restoreFormData() {
    var data = null;
    try {
      data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      data = null;
    }
    if (data === null || typeof data !== 'object') {
      return;
    }
    fieldNames.forEach(function (fieldName) {
      if (typeof data[fieldName] === 'string') {
        form.elements[fieldName].value = data[fieldName];
      }
    });
    firstField.value = keepOnlyLetters(firstField.value);
    phoneField.value = keepPhoneChars(phoneField.value);
    form.elements.agree.checked = data.agree === true;
  }

  function clearFormData() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.log('localStorage недоступен', error);
    }
  }

  // ----- Попап и History API -----

  function showMessage(text, type) {
    messageElement.textContent = text;
    messageElement.className = 'form-message' + (type ? ' ' + type : '');
  }

  function showPopup() {
    popup.hidden = false;
    showMessage('', '');
    firstField.focus();
  }

  function hidePopup() {
    popup.hidden = true;
    openButton.focus();
  }

  function openPopup() {
    // Меняем URL и добавляем запись в историю браузера.
    history.pushState({popup: true}, '', POPUP_HASH);
    showPopup();
  }

  function closePopup() {
    if (history.state && history.state.popup) {
      // Возвращаемся на предыдущую запись; popstate скроет попап.
      history.back();
    } else {
      // Страницу открыли сразу по адресу с #feedback: просто чистим URL.
      history.replaceState(null, '', location.pathname + location.search);
      hidePopup();
    }
  }

  // Кнопка «Назад» (и «Вперёд») в браузере.
  window.addEventListener('popstate', function () {
    if (location.hash === POPUP_HASH) {
      showPopup();
    } else if (!popup.hidden) {
      hidePopup();
    }
  });

  openButton.addEventListener('click', openPopup);
  closeButton.addEventListener('click', closePopup);

  popup.addEventListener('click', function (event) {
    if (event.target === popup) {
      closePopup();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !popup.hidden) {
      closePopup();
    }
  });

  // ----- Сохранение значений при вводе -----

  form.addEventListener('input', saveFormData);
  form.addEventListener('change', saveFormData);

  // ----- Отправка формы через fetch -----

  form.addEventListener('submit', function (event) {
    var payload = {};

    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    fieldNames.forEach(function (fieldName) {
      payload[fieldName] = form.elements[fieldName].value.trim();
    });
    payload._subject = 'Сообщение с сайта (Лабораторная работа 8)';
    payload._replyto = payload.email;
    payload._template = 'table';
    payload._captcha = 'false';

    submitButton.disabled = true;
    showMessage('Отправляем...', '');

    fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json();
    }).then(function (result) {
      if (result.success === true || result.success === 'true') {
        form.reset();
        clearFormData();
        showMessage('Спасибо! Ваше сообщение отправлено.', 'success');
      } else {
        showMessage('Ошибка: не удалось отправить форму. ' + (result.message || ''), 'error');
      }
    }).catch(function () {
      showMessage('Ошибка сети: не удалось отправить форму. Проверьте соединение и попробуйте ещё раз.', 'error');
    }).then(function () {
      submitButton.disabled = false;
    });
  });

  // ----- Инициализация -----

  restoreFormData();

  // Если страницу открыли по ссылке с #feedback — сразу показываем форму.
  if (location.hash === POPUP_HASH) {
    showPopup();
  }

});
