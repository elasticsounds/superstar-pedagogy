import { state, setState } from '../state.js';
import { playActivitySound } from '../audio.js';
import { updateSubmitButtonAndToast, ActivityTypes } from '../utils.js';
import { translateText } from '../translations.js';

export const prepareMultipleChoice = (section) => {
    const activityOptions = section.querySelectorAll(".activity-option");

    // Remove any previous event listeners
    activityOptions.forEach((option) => {
        const newOption = option.cloneNode(true);
        option.parentNode.replaceChild(newOption, option);
    });

    // Add new event listeners
    section.querySelectorAll(".activity-option").forEach((option) => {
        option.addEventListener("click", () => selectOption(option));
        
        // Add hover effect classes
        option.classList.add(
            'cursor-pointer',
            'transition-all',
            'duration-200',
            'hover:shadow-md'
        );

        // Style option label
        const label = option.querySelector("span");
        if (label) {
            label.classList.add(
                'px-4',
                'py-2',
                'rounded-full',
                'font-medium',
                'transition-colors',
                'duration-200'
            );
        }
    });
};

const selectOption = (option) => {
    console.log("=== Selecting option ===");
    
    const activityItem = getActivityItem(option);
    console.log("Option selected:", option);
    console.log("Activity item found:", activityItem);
    
    const radioGroup = option.closest('[role="group"]');
    if (!radioGroup) {
        console.log("No radio group found");
        return;
    }

    // Reset all options in the group
    resetOptions(radioGroup);

    // Select the clicked option
    selectClickedOption(option);

    setState('selectedOption', option);
};

const resetOptions = (radioGroup) => {
    radioGroup.querySelectorAll(".activity-option").forEach((opt) => {
        console.log("Resetting option:", opt);
        
        // Reset letter circle styling
        const letterCircle = opt.querySelector('.option-letter')?.parentElement;
        if (letterCircle) {
            letterCircle.className = 'w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center';
        }
        
        // Reset the letter color
        const letter = opt.querySelector('.option-letter');
        if (letter) {
            letter.className = 'option-letter text-gray-500';
        }
        
        // Reset option container
        opt.classList.remove('bg-green-50', 'bg-red-50');
        
        // Hide feedback
        const feedback = opt.querySelector('.feedback-container');
        if (feedback) {
            feedback.classList.add('hidden');
        }
    });
};

const selectClickedOption = (option) => {
    const input = option.querySelector('input[type="radio"]');
    if (input) {
        input.checked = true;
    }

    // Style the letter circle as selected
    const letterCircle = option.querySelector('.option-letter')?.parentElement;
    if (letterCircle) {
        letterCircle.className = 'w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center';
    }
    
    // Change the letter color to white
    const letter = option.querySelector('.option-letter');
    if (letter) {
        letter.className = 'option-letter text-white';
    }
};

const getActivityItem = (element) => {
    let activityItem = element.getAttribute('data-activity-item');
    
    if (!activityItem) {
        const input = element.querySelector('input[type="radio"]');
        if (input) {
            activityItem = input.getAttribute('data-activity-item');
        }
        
        if (element.tagName === 'INPUT') {
            const label = element.closest('.activity-option');
            if (label) {
                activityItem = label.getAttribute('data-activity-item') || activityItem;
            }
        }
    }
    
    return activityItem;
};

export const checkMultipleChoice = () => {
    console.log("=== Starting validation ===");
    
    if (!state.selectedOption) {
        console.log("No option selected");
        return;
    }
    
    const input = state.selectedOption.querySelector('input[type="radio"]');
    const dataActivityItem = getActivityItem(state.selectedOption);
    const isCorrect = correctAnswers[dataActivityItem];
    
    styleSelectedOption(state.selectedOption, isCorrect);
    showFeedback(state.selectedOption, isCorrect);

    updateSubmitButtonAndToast(
        isCorrect,
        translateText("next-activity"),
        ActivityTypes.MULTIPLE_CHOICE
    );
};

const styleSelectedOption = (option, isCorrect) => {
    const letterCircle = option.querySelector('.option-letter').parentElement;
    letterCircle.className = `w-8 h-8 rounded-full border-2 flex items-center justify-center ${
        isCorrect 
            ? 'border-green-500 bg-green-500 text-white' 
            : 'border-red-500 bg-red-500 text-white'
    }`;
    
    option.classList.add(isCorrect ? 'bg-green-50' : 'bg-red-50');
};

const showFeedback = (option, isCorrect) => {
    const feedbackContainer = option.querySelector('.feedback-container');
    const feedbackIcon = feedbackContainer.querySelector('.feedback-icon');
    const feedbackText = feedbackContainer.querySelector('.feedback-text');
    
    feedbackContainer.classList.remove('hidden');
    
    if (isCorrect) {
        feedbackIcon.className = 'feedback-icon w-5 h-5 rounded-full flex items-center justify-center text-sm bg-green-100 text-green-700';
        feedbackIcon.textContent = '✓';
        feedbackText.className = 'feedback-text text-sm font-medium text-green-700';
        feedbackText.textContent = translateText('multiple-choice-correct-answer');
        playActivitySound('success');
    } else {
        feedbackIcon.className = 'feedback-icon w-5 h-5 rounded-full flex items-center justify-center text-sm bg-red-100 text-red-700';
        feedbackIcon.textContent = '✗';
        feedbackText.className = 'feedback-text text-sm font-medium text-red-700';
        feedbackText.textContent = translateText('multiple-choice-try-again');
        playActivitySound('error');
    }
};