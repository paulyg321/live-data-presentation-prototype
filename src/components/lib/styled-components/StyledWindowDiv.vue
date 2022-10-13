<script setup lang="ts"></script>
<template>
  <div class="window">
    <div class="window-header">
      <div class="dot-container">
        <span class="dot" id="dot-one"></span>
        <span class="dot" id="dot-two"></span>
        <span class="dot" id="dot-three"></span>
      </div>
    </div>
    <div class="window-body">
      <slot></slot>
    </div>
  </div>
</template>
<style>
.window {
  border: 1px solid #F27405;
  border-radius: 10px;
  min-width: 750px;
  max-width: 1020px;
  background-color: white;
}

.window-body {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 40px;
  width: 100%;
}

.window-header {
  width: 100%;
  height: 45px;
  border-bottom: 1px solid #F27405;
  display: flex;
  padding: 0px 20px;
  justify-content: flex-start;
  align-items: center;
}

.dot-container {
  width: 60px;
  display: flex;
  justify-content: space-between;
}

.dot {
  height: 15px;
  width: 15px;
  border-radius: 50%;
  display: inline-block;
}

#dot-one {
  background-color: #F27405;
}

#dot-two {
  background-color: #FB9031;
}

#dot-three {
  background-color: #FCA95F;
}

@media (max-width: 1090px) {
  .window-body {
    flex-direction: column;
    justify-content: center;
    align-items: space-between;
  }
}
</style>
