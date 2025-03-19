import { playActivitySound } from '../audio.js';
import { ActivityTypes, updateSubmitButtonAndToast, provideFeedback } from '../utils.js';
import { countUnfilledInputs } from './fill_in_blank.js';
import { translateText } from '../translations.js';

export const prepareFillInTable = (section) => {
    const inputs = section.querySelectorAll('input[type="text"], textarea');
    setupTableInputs(inputs);
    loadInputState(inputs);
    return inputs;
};

const setupTableInputs = (inputs) => {
    inputs.forEach(input => {
        input.addEventListener('input', handleTableInputChange);
        input.addEventListener('focus', handleTableInputFocus);
        input.addEventListener('blur', handleTableInputBlur);
        
        // Add table-specific styling
        input.classList.add(
            'border',
            'border-gray-300',
            'rounded',
            'p-2',
            'w-full',
            'transition-colors',
            'duration-200'
        );
    });
};

const handleTableInputChange = (event) => {
    const input = event.target;
    validateTableInput(input);
    saveTableInputState(input);
};

const handleTableInputFocus = (event) => {
    const input = event.target;
    input.classList.add('border-blue-500', 'ring-2', 'ring-blue-200');
    
    // Highlight related cells if they exist
    highlightRelatedCells(input);
};

const handleTableInputBlur = (event) => {
    const input = event.target;
    input.classList.remove('border-blue-500', 'ring-2', 'ring-blue-200');
    
    // Remove highlight from related cells
    unhighlightRelatedCells(input);
};

export const checkTableInputs = () => {
    const inputs = document.querySelectorAll('input[type="text"], textarea');
    clearTableFeedback();
    
    const validationResult = validateTableInputs(inputs);
    handleTableValidationResult(validationResult);
};

const clearTableFeedback = () => {
    document.querySelectorAll(".feedback").forEach(el => el.remove());
    document.querySelectorAll(".cell-highlight").forEach(el => {
        el.classList.remove('cell-highlight', 'bg-blue-50');
    });
};

const validateTableInputs = (inputs) => {
    let allFilled = true;
    let unfilledCount = 0;
    let correctCount = 0;

    inputs.forEach(input => {
        const validation = validateSingleTableInput(input);
        if (!validation.isFilled) {
            allFilled = false;
            unfilledCount++;
        }
        if (validation.isCorrect) {
            correctCount++;
        }
    });

    return { allFilled, unfilledCount, correctCount };
};

const validateSingleTableInput = (input) => {
    const value = input.value.trim();
    const dataActivityItem = input.getAttribute("data-activity-item");
    let correctAnswer;
    try {
        correctAnswer = correctAnswers?.[dataActivityItem] ?? null;
    } catch (error) {
        console.log("No correct answer found:");
        correctAnswer = null;
    }
    
    
    const isFilled = value !== "";
    const isCorrect = correctAnswer ? correctAnswer.toLowerCase() === value.toLowerCase() : isFilled;

    provideFeedback(
        input,
        isCorrect,
        correctAnswer,
        ActivityTypes.FILL_IN_A_TABLE
    );

    updateTableCellStyle(input, isFilled, isCorrect);

    return { isFilled, isCorrect };
};

const updateTableCellStyle = (input, isFilled, isCorrect) => {
    const cell = input.closest('td, th');
    if (!cell) return;

    cell.classList.remove('bg-red-50', 'bg-green-50', 'border-red-300', 'border-green-300');
    
    if (isFilled) {
        cell.classList.add(
            isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
        );
    }
};

const handleTableValidationResult = (validationResult) => {
    const { allFilled, unfilledCount } = validationResult;

    if (allFilled) {
        playActivitySound('success');
    } else {
        playActivitySound('error');
    }

    updateSubmitButtonAndToast(
        allFilled,
        translateText("next-activity"),
        ActivityTypes.FILL_IN_A_TABLE,
        unfilledCount
    );
};

const validateTableInput = (input) => {
    const value = input.value.trim();
    const dataActivityItem = input.getAttribute("data-activity-item");
    let correctAnswer;
    try {
        correctAnswer = correctAnswers?.[dataActivityItem] ?? null;
    } catch (error) {
        console.log("No correct answer found:");
        correctAnswer = null;
    }
    
    const isFilled = value !== "";
    const isValid = correctAnswer ? correctAnswer.toLowerCase() === value.toLowerCase() : isFilled;

    updateTableInputValidationStyle(input, isValid);
};

const updateTableInputValidationStyle = (input, isValid) => {
    const cell = input.closest('td, th');
    if (!cell) return;

    input.classList.remove('border-red-500', 'border-green-500');
    cell.classList.remove('bg-red-50', 'bg-green-50');

    if (input.value.trim() !== "") {
        input.classList.add(isValid ? 'border-green-500' : 'border-red-500');
        cell.classList.add(isValid ? 'bg-green-50' : 'bg-red-50');
    }
};

const saveTableInputState = (input) => {
    const activityId = location.pathname
        .substring(location.pathname.lastIndexOf("/") + 1)
        .split(".")[0];
    const inputId = input.getAttribute("data-aria-id");
    const localStorageKey = `${activityId}_${inputId}`;
    
    localStorage.setItem(localStorageKey, input.value);
};

const loadInputState = (inputs) => {
    inputs.forEach((input) => {
        const activityId = location.pathname
            .substring(location.pathname.lastIndexOf("/") + 1)
            .split(".")[0];
        const inputId = input.getAttribute("data-aria-id");
        const localStorageKey = `${activityId}_${inputId}`;
        
        input.value = localStorage.getItem(localStorageKey);
    });
};

const highlightRelatedCells = (input) => {
    const cell = input.closest('td, th');
    if (!cell) return;

    const rowIndex = cell.parentElement.rowIndex;
    const cellIndex = cell.cellIndex;
    const table = cell.closest('table');
    
    if (!table) return;

    // Highlight row
    const row = table.rows[rowIndex];
    Array.from(row.cells).forEach(cell => {
        cell.classList.add('bg-blue-50', 'cell-highlight');
    });

    // Highlight column
    Array.from(table.rows).forEach(row => {
        const cell = row.cells[cellIndex];
        if (cell) {
            cell.classList.add('bg-blue-50', 'cell-highlight');
        }
    });
};

const unhighlightRelatedCells = (input) => {
    document.querySelectorAll('.cell-highlight').forEach(cell => {
        cell.classList.remove('bg-blue-50', 'cell-highlight');
    });
};

// Export utility functions that might be needed by other modules
export { 
    validateTableInput,
    saveTableInputState,
    countUnfilledInputs
};