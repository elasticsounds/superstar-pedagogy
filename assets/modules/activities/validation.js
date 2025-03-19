import { ActivityTypes, updateSubmitButtonAndToast } from '../utils.js';
import { translateText } from '../translations.js';
import { playActivitySound } from '../audio.js';
import { checkMultipleChoice } from './multiple_choice.js';
import { checkFillInTheBlank } from './fill_in_blank.js';
import { checkMatching } from './matching.js';
import { checkSorting } from './sorting.js';
import { checkTrueFalse } from './true_false.js';
import { checkTableInputs } from './fill_in_table.js';
import { isLikelySpanish } from './gibberish_detector.js';

/**
 * Central validation handler for all activity types
 * @param {string} activityType - Type of activity to validate
 * @returns {void}
 */
export const validateInputs = (activityType) => {
    console.log("Validating activity type:", activityType);

    try {
        switch (activityType) {
            case ActivityTypes.MULTIPLE_CHOICE:
                checkMultipleChoice();
                break;

            case ActivityTypes.FILL_IN_THE_BLANK:
                checkFillInTheBlank();
                break;

            case ActivityTypes.OPEN_ENDED_ANSWER:
                validateOpenEndedAnswer();
                break;

            case ActivityTypes.SORTING:
                checkSorting();
                break;

            case ActivityTypes.MATCHING:
                checkMatching();
                break;

            case ActivityTypes.TRUE_FALSE:
                checkTrueFalse();
                break;

            case ActivityTypes.FILL_IN_A_TABLE:
                checkTableInputs();
                break;

            default:
                console.error("Unknown validation type:", activityType);
                throw new Error(`Unsupported activity type: ${activityType}`);
        }
    } catch (error) {
        console.error(`Validation error for ${activityType}:`, error);
        handleValidationError(error);
    }
};

/**
 * Validates text inputs for open-ended answers
 */
const validateOpenEndedAnswer = () => {
    const textInputs = document.querySelectorAll('input[type="text"], textarea');
    const unfilledCount = countUnfilledTextInputs(textInputs);
    
    // Check for gibberish in filled inputs
    const hasGibberish = checkForGibberish(textInputs);
    
    const allValid = unfilledCount === 0 && !hasGibberish;

    playActivityFeedback(allValid);
    updateActivityFeedback(allValid, unfilledCount, hasGibberish);
};

/**
 * Counts unfilled text inputs
 * @param {NodeList} inputs - Collection of input elements
 * @returns {number} Number of unfilled inputs
 */
const countUnfilledTextInputs = (inputs) => {
    let unfilledCount = 0;
    let firstUnfilledInput = null;

    inputs.forEach((input) => {
        const isFilled = input.value.trim() !== "";
        if (!isFilled) {
            unfilledCount++;
            if (!firstUnfilledInput) {
                firstUnfilledInput = input;
            }
        }
        provideFeedback(input, isFilled);
    });

    // Focus first unfilled input for better UX
    if (firstUnfilledInput) {
        firstUnfilledInput.focus();
    }

    return unfilledCount;
};

/**
 * Checks if any filled text inputs contain gibberish instead of Spanish
 * @param {NodeList} inputs - Collection of input elements
 * @returns {boolean} True if gibberish detected
 */
const checkForGibberish = (inputs) => {
    let hasGibberish = false;
    let firstGibberishInput = null;

    inputs.forEach((input) => {
        const text = input.value.trim();
        if (text.length > 0) {
            const isSpanish = isLikelySpanish(text);
            
            if (!isSpanish) {
                hasGibberish = true;
                provideFeedbackForGibberish(input);
                
                if (!firstGibberishInput) {
                    firstGibberishInput = input;
                }
            }
        }
    });

    // Focus first gibberish input for better UX
    if (firstGibberishInput) {
        firstGibberishInput.focus();
    }

    return hasGibberish;
};

/**
 * Provides feedback for gibberish detection
 * @param {HTMLElement} input - Input element with gibberish
 */
const provideFeedbackForGibberish = (input) => {
    const feedback = createFeedbackElement();
    feedback.classList.add("bg-orange-100", "text-orange-800");
    feedback.textContent = translateText("Por favor, escribe en español") || "Por favor, escribe en español";
    
    appendFeedback(input, feedback);
    setupAriaAttributes(input, feedback);
};

/**
 * Provides feedback for input validation
 * @param {HTMLElement} input - Input element to validate
 * @param {boolean} isValid - Validation state
 */
const provideFeedback = (input, isValid) => {
    const feedback = createFeedbackElement();
    
    if (isValid) {
        applyValidFeedbackStyles(feedback);
    } else {
        applyInvalidFeedbackStyles(feedback);
    }

    appendFeedback(input, feedback);
    setupAriaAttributes(input, feedback);
};

/**
 * Creates a feedback element with base styles
 * @returns {HTMLElement} Styled feedback element
 */
const createFeedbackElement = () => {
    const feedback = document.createElement("span");
    feedback.classList.add(
        "feedback",
        "ml-2",
        "px-2",
        "py-1",
        "rounded-full",
        "text-sm",
        "font-medium",
        "transition-colors",
        "duration-200"
    );
    feedback.setAttribute("role", "alert");
    return feedback;
};

/**
 * Applies styles for valid feedback
 * @param {HTMLElement} feedback - Feedback element
 */
const applyValidFeedbackStyles = (feedback) => {
    feedback.classList.add("bg-green-100", "text-green-800");
    feedback.textContent = "✓";
};

/**
 * Applies styles for invalid feedback
 * @param {HTMLElement} feedback - Feedback element
 */
const applyInvalidFeedbackStyles = (feedback) => {
    feedback.classList.add("bg-red-100", "text-red-800");
    feedback.textContent = "×";
};

/**
 * Appends feedback element to input container
 * @param {HTMLElement} input - Input element
 * @param {HTMLElement} feedback - Feedback element
 */
const appendFeedback = (input, feedback) => {
    const container = input.parentElement;
    const existingFeedback = container.querySelector(".feedback");
    
    if (existingFeedback) {
        container.removeChild(existingFeedback);
    }
    
    container.appendChild(feedback);
};

/**
 * Sets up ARIA attributes for accessibility
 * @param {HTMLElement} input - Input element
 * @param {HTMLElement} feedback - Feedback element
 */
const setupAriaAttributes = (input, feedback) => {
    const feedbackId = `feedback-${Math.random().toString(36).substr(2, 9)}`;
    feedback.id = feedbackId;
    input.setAttribute("aria-describedby", feedbackId);
};

/**
 * Plays appropriate feedback sound
 * @param {boolean} isSuccess - Whether to play success or error sound
 */
const playActivityFeedback = (isSuccess) => {
    playActivitySound(isSuccess ? 'success' : 'error');
};

/**
 * Updates activity feedback and UI state
 * @param {boolean} isValid - Overall validation state
 * @param {number} unfilledCount - Number of unfilled inputs
 * @param {boolean} hasGibberish - Whether gibberish was detected
 */
const updateActivityFeedback = (isValid, unfilledCount, hasGibberish) => {
    updateSubmitButtonAndToast(
        isValid,
        translateText("next-activity"),
        ActivityTypes.OPEN_ENDED_ANSWER,
        unfilledCount
    );
    
    // Add specific feedback for gibberish if needed
    if (hasGibberish) {
        const toast = document.getElementById("toast");
        if (toast) {
            toast.classList.remove("hidden");
            toast.classList.add("bg-orange-200", "text-orange-700");
            toast.textContent = translateText("Por favor, escribe en español") || "Por favor, escribe en español";
            
            setTimeout(() => {
                toast.classList.add("hidden");
            }, 3000);
        }
    }
};

/**
 * Handles validation errors
 * @param {Error} error - Error object
 */
const handleValidationError = (error) => {
    const toast = document.getElementById("toast");
    if (toast) {
        toast.textContent = translateText("validation-error");
        toast.classList.remove("hidden");
        toast.classList.add("bg-red-200", "text-red-700");
        
        setTimeout(() => {
            toast.classList.add("hidden");
        }, 3000);
    }
};