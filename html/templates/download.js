import '../web-components/bc-check-box';

// Timeout until the user has to click "I trust the source" again
const TRUSTED_USER_TIMEOUT = 1000 * 60 * 60 * 24 * 3; // 3 Days
const TRUSTED_USER_LIST_KEY = 'trusted-users';

const userId = document.currentScript.dataset.userid;
const confirmStreamBox = document.querySelector('.confirm');
const confirmStreamCheckbox = document.querySelector('.confirm > bc-check-box');
const streamLink = document.querySelector('#stream-link');
let timeout = null;

streamLink.addEventListener('click', e => {

    // Fetch already approved users and filter out expired items
    const trustedUsers = JSON.parse(localStorage.getItem(TRUSTED_USER_LIST_KEY) || '[]')
        .filter(v => (Date.now() - v.timestamp) < TRUSTED_USER_TIMEOUT);

    // User already approved this source
    if (trustedUsers.find(v => v.id === userId)) {
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
            TRUSTED_USER_LIST_KEY,
            JSON.stringify([
                ...trustedUsers,
                {id: userId, timestamp: Date.now()}
            ])
        );
    }
});
