import { playActivitySound } from '../audio.js';
import { updateSubmitButtonAndToast, provideFeedback } from '../utils.js';
import { ActivityTypes } from '../utils.js';

export const prepareOpenEnded = (section) => {
    const inputs = section.querySelectorAll('input[type="text"], textarea');
    setupInputListeners(inputs);
    loadInputState(inputs);
    return inputs;
};

const setupInputListeners = (inputs) => {
    inputs.forEach(input => {
        input.addEventListener('input', handleInputChange);
        input.addEventListener('focus', handleInputFocus);
        input.addEventListener('blur', handleInputBlur);
    });
};

const handleInputChange = (event) => {
    const input = event.target;
    saveInputState(input);
};

const handleInputFocus = (event) => {
    event.target.classList.add('border-blue-500', 'ring-2', 'ring-blue-200');
};

const handleInputBlur = (event) => {
    event.target.classList.remove('border-blue-500', 'ring-2', 'ring-blue-200');
};

const saveInputState = (input) => {
    const activityId = location.pathname
        .substring(location.pathname.lastIndexOf("/") + 1)
        .split(".")[0];
    const inputId = input.getAttribute("data-aria-id");
    const localStorageKey = `${activityId}_${inputId}`;
    
    localStorage.setItem(localStorageKey, input.value);
};

export const loadInputState = (inputs) => {
    inputs.forEach((input) => {
        const activityId = location.pathname
            .substring(location.pathname.lastIndexOf("/") + 1)
            .split(".")[0];
        const inputId = input.getAttribute("data-aria-id");
        const localStorageKey = `${activityId}_${inputId}`;
        
        input.value = localStorage.getItem(localStorageKey);
    });
};

export const countUnfilledInputs = (inputs) => {
    let unfilledCount = 0;
    let firstUnfilledInput = null;

    inputs.forEach((input) => {
        const isFilled = input.value.trim() !== "";
        provideFeedback(input, isFilled, "");

        if (!isFilled) {
            unfilledCount++;
            if (!firstUnfilledInput) {
                firstUnfilledInput = input;
            }
        }
    });

    if (firstUnfilledInput) {
        firstUnfilledInput.focus();
    }

    return unfilledCount;
};