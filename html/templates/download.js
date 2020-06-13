import '../web-components/bc-check-box';

const userId = document.getElementById('data').dataset.userid;
const trustedUserKey = 'trusted-users';
const trustedUsers = JSON.parse(localStorage.getItem(trustedUserKey) || '[]');
const confirmStreamBox = document.querySelector('.confirm');
const confirmStreamCheckbox = document.querySelector('.confirm > bc-check-box');
const streamLink = document.querySelector('#stream-link');
let timeout = null;

streamLink.addEventListener('click', e => {

    // User already approved this source
    if (trustedUsers.includes(userId)) {
        return;
    }

    // Check if user approved this source
    if (!confirmStreamCheckbox.checked) {
        e.preventDefault();

        if (timeout !== null) {
            clearTimeout(timeout);
        }

        confirmStreamBox.classList.add('flashing', 'visible');
        timeout = setTimeout(() => {
            confirmStreamBox.classList.remove('flashing');
        }, 750);
    } else {
        localStorage.setItem(
            trustedUserKey,
            JSON.stringify([...trustedUsers, userId])
        );
    }
});
