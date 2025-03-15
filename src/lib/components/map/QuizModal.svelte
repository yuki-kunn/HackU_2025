<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';
  
  export let quest;
  export let quizData;
  
  const dispatch = createEventDispatcher();
  
  let selectedAnswer = '';
  
  function checkAnswer() {
    const isCorrect = selectedAnswer === quizData.correctAnswer;
    dispatch('answer', { 
      questId: quest.id,
      isCorrect,
      selectedAnswer 
    });
  }
  
  function closeQuiz() {
    dispatch('close');
  }
</script>

<div class="quiz-overlay" transition:fade={{ duration: 300 }}>
  <div class="quiz-container">
    <div class="quest-header">
      <h2>クエストクリアチャレンジ！</h2>
      <div class="quest-name">{quest.name}</div>
    </div>
    
    <div class="quiz-content">
      <div class="quiz-question">
        {quizData.question}
      </div>
      
      <div class="quiz-options">
        {#each quizData.options as option, index}
          <label class="quiz-option">
            <input
              type="radio"
              name="answer"
              value={option}
              bind:group={selectedAnswer}
            />
            <span class="option-text">{index + 1}. {option}</span>
          </label>
        {/each}
      </div>
      
      <div class="quiz-actions">
        <button class="submit-btn" on:click={checkAnswer} disabled={!selectedAnswer}>
          回答する
        </button>
        <button class="cancel-btn" on:click={closeQuiz}>
          キャンセル
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .quiz-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .quiz-container {
    background-color: white;
    border-radius: 12px;
    max-width: 90%;
    width: 500px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }
  
  .quest-header {
    background-color: #4285F4;
    color: white;
    padding: 15px 20px;
    text-align: center;
  }
  
  .quest-header h2 {
    margin: 0 0 5px;
    font-size: 20px;
  }
  
  .quest-name {
    font-weight: bold;
    font-size: 18px;
  }
  
  .quiz-content {
    padding: 20px;
  }
  
  .quiz-question {
    font-size: 16px;
    margin-bottom: 20px;
    line-height: 1.5;
  }
  
  .quiz-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }
  
  .quiz-option {
    display: flex;
    align-items: center;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .quiz-option:hover {
    background-color: #f5f8ff;
    border-color: #4285F4;
  }
  
  .quiz-option input {
    margin-right: 12px;
    transform: scale(1.2);
  }
  
  .option-text {
    flex: 1;
  }
  
  .quiz-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
  }
  
  button {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .submit-btn {
    background-color: #4285F4;
    color: white;
  }
  
  .submit-btn:hover:not(:disabled) {
    background-color: #3367D6;
  }
  
  .submit-btn:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
  
  .cancel-btn {
    background-color: #f1f1f1;
    color: #333;
  }
  
  .cancel-btn:hover {
    background-color: #e0e0e0;
  }
</style>
