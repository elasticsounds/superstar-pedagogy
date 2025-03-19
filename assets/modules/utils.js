import { state } from './state.js';
import { setCookie } from './cookies.js';
import { translateText } from './translations.js';
import { nextPage } from './navigation.js';
import { stopAudio, unhighlightAllElements, playActivitySound } from './audio.js';

export const ActivityTypes = Object.freeze({
    MULTIPLE_CHOICE: "activity_multiple_choice",
    FILL_IN_THE_BLANK: "activity_fill_in_the_blank",
    SORTING: "activity_sorting",
    OPEN_ENDED_ANSWER: "activity_open_ended_answer",
    MATCHING: "activity_matching",
    TRUE_FALSE: "activity_true_false",
    FILL_IN_A_TABLE: "activity_fill_in_a_table",
});

export const toggleButtonState = (buttonId, toState = null) => {
    const button = document.getElementById(buttonId);
    if (button) {
        const isChecked = button.getAttribute('aria-checked') === 'true';
        const newState = toState !== null ? toState : !isChecked;

        button.setAttribute('aria-checked', newState);
        button.querySelector('#toggle-dot').classList.toggle('translate-x-5', newState);
        button.querySelector('#toggle-background').classList.toggle('bg-gray-400', !newState);
        button.querySelector('#toggle-background').classList.toggle('bg-blue-700', newState);
    } else {
        console.error(`No element found with ID: ${buttonId}`);
    }
};

export const updateSubmitButtonAndToast = (
    isCorrect,
    buttonText = translateText("next-activity"),
    activityType,
    unfilledCount = 0
) => {
    const submitButton = document.getElementById("submit-button");
    const toast = document.getElementById("toast");

    submitButton.removeEventListener("click", state.validateHandler);
    submitButton.removeEventListener("click", state.retryHandler);
    
    checkCurrentActivityCompletion(isCorrect);
    
    if (isCorrect) {
        submitButton.textContent = buttonText;
        
        if (toast) {
            toast.classList.remove("hidden");
            toast.classList.remove("bg-red-200", "text-red-700");
            toast.classList.add("bg-green-200", "text-green-700");

            if (activityType === ActivityTypes.OPEN_ENDED_ANSWER || 
                activityType === ActivityTypes.FILL_IN_A_TABLE) {
                toast.textContent = translateText("answers-submitted");
            } else {
                toast.textContent = translateText("correct-answer");
            }
        }

        if (buttonText === translateText("next-activity")) {
            submitButton.addEventListener("click", nextPage);
            submitButton.setAttribute("aria-label", translateText("next-activity"));

            const activityId = location.pathname
                .substring(location.pathname.lastIndexOf("/") + 1)
                .split(".")[0];
            localStorage.setItem(`${activityId}_success`, "true");
        }

        setTimeout(() => {
            toast?.classList.add("hidden");
        }, 3000);
    } else {
        handleIncorrectSubmission(submitButton, toast, activityType, unfilledCount);
    }
};

export const checkCurrentActivityCompletion = (isCorrect) => {
    const activityId = location.pathname.substring(location.pathname.lastIndexOf("/") + 1).split(".")[0];
    const currentActivityIcon = document.querySelector(`[class*="${activityId}"]`);
    if (isCorrect) {
      currentActivityIcon.classList.replace("fa-pen-to-square", "fa-square-check");
      currentActivityIcon.classList.replace("text-blue-700", "text-green-500");
    } else {
      currentActivityIcon.classList.replace("fa-square-check", "fa-pen-to-square");
      currentActivityIcon.classList.replace("text-green-500", "text-blue-700");
    }
}

const handleIncorrectSubmission = (submitButton, toast, activityType, unfilledCount) => {
    if (activityType === ActivityTypes.MULTIPLE_CHOICE) {
        submitButton.textContent = translateText("retry");
        submitButton.setAttribute("aria-label", translateText("retry"));
        state.retryHandler = retryActivity;
        submitButton.addEventListener("click", state.retryHandler);
    } else {
        submitButton.textContent = translateText("submit-text");
        submitButton.setAttribute("aria-label", translateText("submit-text"));
        submitButton.addEventListener("click", state.validateHandler);
    }

    updateToastForIncorrectSubmission(toast, activityType, unfilledCount);
};

const updateToastForIncorrectSubmission = (toast, activityType, unfilledCount) => {
    if (!toast) return;

    toast.classList.remove("hidden");
    toast.classList.add("bg-red-200", "text-red-700");

    if (activityType === ActivityTypes.OPEN_ENDED_ANSWER ||
        activityType === ActivityTypes.FILL_IN_THE_BLANK ||
        activityType === ActivityTypes.FILL_IN_A_TABLE) {
        
        if (unfilledCount > 0) {
            toast.textContent = translateText("fill-in-the-blank-not-complete", {
                unfilledCount: unfilledCount,
            });
        } else if (unfilledCount === 0 && 
                  activityType === ActivityTypes.FILL_IN_THE_BLANK) {
            toast.textContent = translateText("fill-in-the-blank-correct-the-answers");
        }
    } else {
        toast.textContent = translateText("fill-in-the-blank-try-again");
    }

    setTimeout(() => {
        toast.classList.add("hidden");
    }, 3000);
};

export const provideFeedback = (element, isCorrect, correctAnswer, activityType) => {
    let feedback = document.createElement("span");
    feedback.classList.add(
        "feedback",
        "ml-2",
        "px-2",
        "py-1",
        "rounded-full",
        "text-lg",
        "w-32",
        "text-center"
    );
    feedback.setAttribute("role", "alert");

    const dataActivityItem = element.getAttribute("data-activity-item");
    if (dataActivityItem) {
        feedback.setAttribute("aria-labelledby", dataActivityItem);
    }

    handleFeedbackPlacement(element, feedback, activityType);
    updateFeedbackContent(feedback, isCorrect, activityType, element);

    // Set ARIA attributes
    feedback.id = `feedback-${dataActivityItem}`;
    element.setAttribute("aria-describedby", feedback.id);
};

const handleFeedbackPlacement = (element, feedback, activityType) => {
    if (activityType === ActivityTypes.FILL_IN_THE_BLANK) {
        element.parentNode.appendChild(feedback);
    } else if (activityType === ActivityTypes.MULTIPLE_CHOICE) {
        const feedbackContainer = document.querySelector(".questions");
        feedbackContainer?.appendChild(feedback);
    }
};

const updateFeedbackContent = (feedback, isCorrect, activityType, element) => {
    feedback.innerText = "";
    feedback.classList.remove(
        "bg-green-200",
        "text-green-700",
        "bg-red-200",
        "text-red-700"
    );

    if (activityType === ActivityTypes.FILL_IN_THE_BLANK ||
        activityType === ActivityTypes.OPEN_ENDED_ANSWER ||
        activityType === ActivityTypes.FILL_IN_A_TABLE) {
        
        handleTextInputFeedback(feedback, isCorrect);
    } else if (activityType === ActivityTypes.MULTIPLE_CHOICE) {
        handleMultipleChoiceFeedback(feedback, isCorrect, element);
    }
};

const handleTextInputFeedback = (feedback, isCorrect) => {
    if (isCorrect) {
        feedback.classList.add("bg-green-200", "text-green-700");
        feedback.innerText = translateText("fill-in-the-blank-correct-answer");
    } else {
        feedback.innerText = translateText("fill-in-the-blank-try-again");
        feedback.classList.add("bg-red-200", "text-red-700");
    }
};

const handleMultipleChoiceFeedback = (feedback, isCorrect, element) => {
    const label = element.closest(".activity-option");
    if (!label) return;

    const associatedLabel = label.querySelector("span");
    if (!associatedLabel) return;

    const existingMark = associatedLabel.querySelector(".mark");
    existingMark?.remove();

    const mark = document.createElement("span");
    mark.className = "mark";

    if (isCorrect) {
        updateForCorrectChoice(feedback, mark, associatedLabel);
    } else {
        updateForIncorrectChoice(feedback, mark, associatedLabel);
    }
};

const updateForCorrectChoice = (feedback, mark, associatedLabel) => {
    feedback.innerText = translateText("multiple-choice-correct-answer");
    feedback.classList.add("bg-green-200", "text-green-700");
    mark.classList.add("mark", "tick");
    mark.innerText = "✔️";
    associatedLabel.prepend(mark);
    associatedLabel.classList.add("bg-green-600");
};

const updateForIncorrectChoice = (feedback, mark, associatedLabel) => {
    feedback.classList.add("bg-red-200", "text-red-700");
    feedback.innerText = translateText("multiple-choice-try-again");
    mark.classList.add("mark", "cross");
    mark.innerText = "❌";
    associatedLabel.prepend(mark);
    associatedLabel.classList.add("bg-red-200", "text-black");
};

export const retryActivity = () => {
    console.log("=== Retrying Activity ===");
    playActivitySound('reset');
    
    clearFeedback();
    resetButtons();
    resetButtonState();
    
    console.log("=== Retry Setup Complete ===");
};

const clearFeedback = () => {
    document.querySelectorAll(".feedback").forEach(feedback => {
        console.log("Removing feedback:", feedback);
        feedback.remove();
    });

    const toast = document.getElementById("toast");
    if (toast) {
        console.log("Removing toast");
        toast.remove();
    }
};

const resetButtons = () => {
    const allRadioButtons = document.querySelectorAll("input[type='radio']");
    allRadioButtons.forEach(button => {
        console.log("Resetting radio button:", button);
        button.classList.remove("bg-green-200", "bg-red-200", "text-black");
    });
};

const resetButtonState = () => {
    state.selectedButton = null;
    console.log("Reset selectedButton to null");

    const submitButton = document.getElementById("submit-button");
    if (submitButton) {
        console.log("Resetting submit button");
        submitButton.textContent = translateText("submit-text");
        submitButton.setAttribute("aria-label", translateText("submit-text"));

        submitButton.removeEventListener("click", state.retryHandler);
        submitButton.removeEventListener("click", state.validateHandler);
        submitButton.addEventListener("click", state.validateHandler);
        console.log("Restored validation handler");
    }
};

// Add any other utility functions you need here...