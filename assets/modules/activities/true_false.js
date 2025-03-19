import { state, setState } from '../state.js';
import { playActivitySound } from '../audio.js';
import { updateSubmitButtonAndToast } from '../utils.js';
import { ActivityTypes } from '../utils.js';

export const prepareTrueFalse = (section) => {
    console.log("=== Preparing True/False Activity ===");
    
    initializeAudio();
    setupRadioButtons(section);
    
    console.log("=== Activity Preparation Complete ===");
};

const initializeAudio = () => {
    playActivitySound(''); // Initialize audio system
};

const setupRadioButtons = (section) => {
    const buttons = section.querySelectorAll("input[type='radio']");
    console.log("Found radio buttons:", buttons.length);
    
    buttons.forEach((button, index) => {
        logButtonDetails(button, index);
        addButtonListener(button);
    });
};

const logButtonDetails = (button, index) => {
    console.log(`Button ${index + 1}:`, {
        value: button.value,
        dataActivityItem: button.getAttribute("data-activity-item"),
        name: button.name
    });
};

const addButtonListener = (button) => {
    button.addEventListener("click", () => {
        playActivitySound('drop');
        
        console.log("Button clicked:", {
            value: button.value,
            dataActivityItem: button.getAttribute("data-activity-item")
        });
        
        setState('selectedButton', button);
    });
};

export const checkTrueFalse = () => {
    clearPreviousFeedback();
    const allQuestions = [1, 2, 3, 4, 5];
    const validationResults = validateAllQuestions(allQuestions);
    
    playAppropriateSound(validationResults.allCorrect);
    
    updateSubmitButtonAndToast(
        validationResults.allCorrect,
        "Next Activity",
        ActivityTypes.TRUE_FALSE
    );
};

const clearPreviousFeedback = () => {
    document.querySelectorAll(".feedback").forEach(el => el.remove());
    document.querySelectorAll(".validation-mark").forEach(mark => {
        mark.classList.add('hidden');
        mark.textContent = '';
    });
};

const validateAllQuestions = (allQuestions) => {
    let allCorrect = true;
    
    allQuestions.forEach(questionNum => {
        const selectedButton = document.querySelector(
            `input[name="question${questionNum}"]:checked`
        );
        
        if (!selectedButton) {
            console.log(`Question ${questionNum}: No selection made`);
            allCorrect = false;
            return;
        }

        const validationResult = validateQuestion(selectedButton);
        if (!validationResult) {
            allCorrect = false;
        }
    });

    return { allCorrect };
};

const validateQuestion = (selectedButton) => {
    const dataActivityItem = selectedButton.getAttribute("data-activity-item");
    const selectedValue = selectedButton.value;
    const expectedAnswer = correctAnswers[dataActivityItem];
    const isCorrect = expectedAnswer === selectedValue;
    
    updateValidationDisplay(selectedButton, isCorrect);
    
    return isCorrect;
};

const updateValidationDisplay = (selectedButton, isCorrect) => {
    const validationMark = getValidationMark(selectedButton);
    if (validationMark) {
        updateValidationMark(validationMark, isCorrect);
    }

    updateButtonStyling(selectedButton, isCorrect);
};

const getValidationMark = (button) => {
    const validationMark = button.parentElement.querySelector(".validation-mark");
    if (validationMark) {
        validationMark.classList.remove('hidden');
    }
    return validationMark;
};

const updateValidationMark = (mark, isCorrect) => {
    const baseClasses = 'text-lg font-bold bg-white rounded-full w-6 h-6 flex items-center justify-center';
    
    if (isCorrect) {
        mark.textContent = '✓';
        mark.className = `validation-mark ${baseClasses} text-green-600`;
    } else {
        mark.textContent = '✗';
        mark.className = `validation-mark ${baseClasses} text-red-600`;
    }
};

const updateButtonStyling = (button, isCorrect) => {
    const buttonDiv = button.parentElement.querySelector('div');
    if (buttonDiv) {
        buttonDiv.classList.remove('bg-gray-200', 'bg-green-500', 'bg-red-500', 'peer-checked:bg-blue-500');
        buttonDiv.classList.add(isCorrect ? 'bg-green-500' : 'bg-red-500');
    }
};

const playAppropriateSound = (allCorrect) => {
    playActivitySound(allCorrect ? 'success' : 'error');
};

export const retryTrueFalse = () => {
    clearPreviousFeedback();
    resetButtonStates();
    setState('selectedButton', null);
};

const resetButtonStates = () => {
    document.querySelectorAll("input[type='radio']").forEach(button => {
        button.checked = false;
        const buttonDiv = button.parentElement.querySelector('div');
        if (buttonDiv) {
            buttonDiv.classList.remove('bg-green-500', 'bg-red-500');
            buttonDiv.classList.add('bg-gray-200', 'peer-checked:bg-blue-500');
        }
    });
};