import { playActivitySound } from '../audio.js';
import { updateSubmitButtonAndToast, provideFeedback, ActivityTypes } from '../utils.js';
import { loadInputState } from './open_ended.js';
import { translateText } from '../translations.js';


export const preparefillInBlank = (section) => {
    const inputs = section.querySelectorAll('input[type="text"]');
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
    validateInput(input);
    saveInputState(input);
};

const handleInputFocus = (event) => {
    event.target.classList.add('border-blue-500', 'ring-2', 'ring-blue-200');
};

const handleInputBlur = (event) => {
    event.target.classList.remove('border-blue-500', 'ring-2', 'ring-blue-200');
};

export const checkFillInTheBlank = () => {
    const inputs = document.querySelectorAll('input[type="text"]');
    clearOldFeedback();
    
    const validationResult = validateAllInputs(inputs);
    
    handleValidationResult(validationResult);
};

const clearOldFeedback = () => {
    const oldFeedbacks = document.querySelectorAll(".feedback");
    oldFeedbacks.forEach(feedback => feedback.remove());
};

const validateAllInputs = (inputs) => {
    let allCorrect = true;
    let firstIncorrectInput = null;
    let unfilledCount = 0;

    inputs.forEach((input) => {
        const validation = validateSingleInput(input);
        
        if (!validation.isCorrect) {
            allCorrect = false;
            if (!firstIncorrectInput && !validation.isFilled) {
                firstIncorrectInput = input;
            }
        }
        
        if (!validation.isFilled) {
            unfilledCount++;
        }
    });

    return { allCorrect, firstIncorrectInput, unfilledCount };
};

const validateSingleInput = (input) => {
    const dataActivityItem = input.getAttribute("data-activity-item");
    const correctAnswer = correctAnswers[dataActivityItem];
    const inputValue = input.value.trim();
    
    const isFilled = inputValue !== "";
    const isCorrect = correctAnswer && 
                     correctAnswer.toLowerCase() === inputValue.toLowerCase();

    provideFeedback(
        input,
        isCorrect,
        correctAnswer,
        ActivityTypes.FILL_IN_THE_BLANK
    );

    if (!isCorrect) {
        setAriaAttributes(input, dataActivityItem);
    }

    return { isCorrect, isFilled };
};

const setAriaAttributes = (input, dataActivityItem) => {
    const feedbackElement = input.parentNode.querySelector(".feedback");
    if (feedbackElement) {
        feedbackElement.setAttribute("aria-live", "assertive");
        feedbackElement.id = `feedback-${dataActivityItem}`;
        input.setAttribute("aria-describedby", feedbackElement.id);
    }
};

const handleValidationResult = (validationResult) => {
    const { allCorrect, firstIncorrectInput, unfilledCount } = validationResult;

    if (firstIncorrectInput) {
        firstIncorrectInput.focus();
    }

    playActivitySound(allCorrect ? 'success' : 'error');

    updateSubmitButtonAndToast(
        allCorrect,
        translateText("next-activity"),
        ActivityTypes.FILL_IN_THE_BLANK,
        unfilledCount
    );
};

const validateInput = (input) => {
    const value = input.value.trim();
    const dataActivityItem = input.getAttribute("data-activity-item");
    const correctAnswer = correctAnswers[dataActivityItem];

    const isValid = value !== "" && 
                   correctAnswer && 
                   correctAnswer.toLowerCase() === value.toLowerCase();

    updateInputValidationStyle(input, isValid);
};

const updateInputValidationStyle = (input, isValid) => {
    input.classList.remove('border-red-500', 'border-green-500');
    if (input.value.trim() !== "") {
        input.classList.add(isValid ? 'border-green-500' : 'border-red-500');
    }
};

const saveInputState = (input) => {
    const activityId = location.pathname
        .substring(location.pathname.lastIndexOf("/") + 1)
        .split(".")[0];
    const inputId = input.getAttribute("data-aria-id");
    const localStorageKey = `${activityId}_${inputId}`;
    
    localStorage.setItem(localStorageKey, input.value);
};

export const autofillCorrectAnswers = () => {
    const inputs = document.querySelectorAll('input[type="text"]');
    inputs.forEach((input) => {
        const dataActivityItem = input.getAttribute("data-activity-item");
        const correctAnswer = correctAnswers[dataActivityItem];

        if (correctAnswer) {
            input.value = correctAnswer;
            validateInput(input);
            saveInputState(input);
        }
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