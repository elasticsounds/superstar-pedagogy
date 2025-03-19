import { state, setState } from '../state.js';
import { playActivitySound } from '../audio.js';
import { updateSubmitButtonAndToast } from '../utils.js';
import { translateText } from '../translations.js';
import { ActivityTypes } from '../utils.js';

export const prepareMatching = (section) => {
    setupWordButtons(section);
    setupDropzones(section);
    setupDragListeners();
};

const setupWordButtons = (section) => {
    const wordButtons = section.querySelectorAll(".activity-item");
    wordButtons.forEach((button) => {
        button.addEventListener("click", () => selectWord(button));
        button.addEventListener("dragstart", (event) => drag(event));
        button.addEventListener("keydown", (event) => handleWordButtonKeydown(event, button));
        button.setAttribute("tabindex", "0");
        button.style.cursor = "pointer";
    });
};

const setupDropzones = (section) => {
    const dropzones = section.querySelectorAll(".dropzone");
    dropzones.forEach((dropzone) => {
        dropzone.addEventListener("click", () => dropWord(dropzone.id));
        dropzone.addEventListener("drop", (event) => drop(event));
        dropzone.addEventListener("dragover", (event) => allowDrop(event));
        dropzone.addEventListener("keydown", (event) => handleDropzoneKeydown(event, dropzone));
        dropzone.setAttribute("tabindex", "0");
        dropzone.style.cursor = "pointer";
    });
};

const setupDragListeners = () => {
    const activityItems = document.querySelectorAll(".activity-item");
    activityItems.forEach(item => {
        item.addEventListener("click", (event) => {
            const dropzone = event.target.closest(".dropzone");
            if (dropzone) {
                dropWord(dropzone.id);
            } else {
                returnCardToOriginalPosition(event.target);
            }
        });
        item.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                const dropzone = event.target.closest(".dropzone");
                if (dropzone) {
                    dropWord(dropzone.id);
                } else {
                    returnCardToOriginalPosition(event.target);
                }
            }
        });
    });
};

const handleWordButtonKeydown = (event, button) => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectWord(button);
    }
};

const handleDropzoneKeydown = (event, dropzone) => {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        dropWord(dropzone.id);
    }
};

export const selectWord = (button) => {
    // If a word is already selected, deselect it
    if (state.selectedWord) {
        state.selectedWord.classList.remove("border-4", "border-blue-500");
    }

    // Mark the current word as selected
    button.classList.add("border-4", "border-blue-500");
    setState('selectedWord', button);
};

export const dropWord = (dropzoneId) => {
    if (!state.selectedWord) return;

    const target = document.getElementById(dropzoneId)
        .querySelector("div[role='region']");
    const existingWord = target.firstElementChild;

    if (existingWord) {
        // Move the existing word back to the original word list or swap positions
        const originalParent = state.selectedWord.parentElement;
        originalParent.appendChild(existingWord);
    }

    // Place the selected word in the dropzone
    target.appendChild(state.selectedWord);

    // Reset the selected word highlight
    state.selectedWord.classList.remove("border-4", "border-blue-500");
    setState('selectedWord', null);
};

export const allowDrop = (event) => {
    event.preventDefault();
};

export const drag = (event) => {
    event.dataTransfer.setData(
        "text",
        event.target.getAttribute("data-activity-item")
    );
};

export const drop = (event) => {
    event.preventDefault();
    const data = event.dataTransfer.getData("text");
    const target = event.currentTarget.querySelector("div[role='region']");
    const wordElement = document.querySelector(
        `.activity-item[data-activity-item='${data}']`
    );
    const existingWord = target.firstElementChild;

    handleDropExchange(existingWord, wordElement, target);

    // Reset the selected word highlight
    if (state.selectedWord) {
        state.selectedWord.classList.remove("border-4", "border-blue-500");
        setState('selectedWord', null);
    }
};

const handleDropExchange = (existingWord, wordElement, target) => {
    if (existingWord) {
        const originalParent = wordElement.parentElement;
        originalParent.appendChild(existingWord);
    }
    target.appendChild(wordElement);
};

const returnCardToOriginalPosition = (card) => {
    const originalParent = document.querySelector(".original-word-list");
    if (originalParent) {
        originalParent.appendChild(card);
    }
};

export const checkMatching = () => {
    let correctCount = 0;
    resetDropzones();

    Object.keys(correctAnswers).forEach((item) => {
        const wordElement = document.querySelector(
            `.activity-item[data-activity-item='${item}']`
        );

        if (wordElement) {
            const parentDropzone = wordElement.closest(".dropzone");
            handleDropzoneValidation(parentDropzone, item, correctAnswers[item], () => correctCount++);
        }
    });

    updateFeedback(correctCount);
};

const resetDropzones = () => {
    const dropzones = document.querySelectorAll(".dropzone");
    dropzones.forEach((dropzone) => {
        dropzone.classList.remove("bg-green-200", "bg-red-200");
    });
};

const handleDropzoneValidation = (parentDropzone, item, correctAnswer, onCorrect) => {
    if (parentDropzone) {
        const isCorrect = parentDropzone.querySelector("div[role='region']").id === correctAnswer;
        parentDropzone.classList.add(isCorrect ? "bg-green-200" : "bg-red-200");
        if (isCorrect) {
            onCorrect();
        }
    }
};

const updateFeedback = (correctCount) => {
    const feedback = document.getElementById("feedback");
    const totalItems = Object.keys(correctAnswers).length;
    const isAllCorrect = correctCount === totalItems;

    playActivitySound(isAllCorrect ? 'success' : 'error');

    if (feedback) {
        updateFeedbackText(feedback, isAllCorrect, correctCount);
    }

    updateSubmitButtonAndToast(
        isAllCorrect,
        translateText("next-activity"),
        ActivityTypes.MATCHING
    );
};

const updateFeedbackText = (feedback, isAllCorrect, correctCount) => {
    if (isAllCorrect) {
        feedback.textContent = translateText("matching-correct-answers");
        feedback.classList.remove("text-red-500");
        feedback.classList.add("text-green-500");
    } else {
        feedback.textContent = translateText("matching-correct-answers-count", {
            correctCount: correctCount,
        });
        feedback.classList.remove("text-green-500");
        feedback.classList.add("text-red-500");
    }
};