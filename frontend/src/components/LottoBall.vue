<script setup>
import { computed } from 'vue';

const props = defineProps({
  number: {
    type: Number,
    required: true,
  },
  size: {
    type: String,
    default: 'md', // 'sm' | 'md' | 'lg'
  },
  isMatched: {
    type: Boolean,
    default: false,
  },
  variant: {
    type: String,
    default: 'default', // 'default' | 'gold' | 'peach' | 'mint' | 'lavender' | 'rose' | 'accent'
  },
  className: {
    type: String,
    default: '',
  },
});

const formattedNumber = computed(() => {
  return String(props.number).padStart(2, '0');
});

const sizeClasses = {
  sm: 'w-7 h-7 text-xs font-bold',
  md: 'w-9 h-9 sm:w-10 sm:h-10 text-sm font-extrabold shadow-sm',
  lg: 'w-11 h-11 sm:w-12 sm:h-12 text-base font-black shadow-md',
};

const colorClasses = computed(() => {
  if (props.isMatched) {
    return 'bg-nav-sand text-ui-charcoal border-2 border-ui-charcoal font-black';
  } else if (props.variant === 'gold') {
    return 'bg-metric-orange text-ui-charcoal border border-ui-charcoal';
  } else if (props.variant === 'peach') {
    return 'bg-metric-salmon text-ui-charcoal border border-ui-charcoal';
  } else if (props.variant === 'mint') {
    return 'bg-metric-mint text-ui-charcoal border border-ui-charcoal';
  } else if (props.variant === 'lavender') {
    return 'bg-metric-lavender text-ui-charcoal border border-ui-charcoal';
  } else if (props.variant === 'rose') {
    return 'bg-metric-salmon/60 text-ui-charcoal border border-ui-charcoal';
  } else {
    return 'bg-ui-charcoal text-nav-sand border border-ui-charcoal font-black';
  }
});
</script>

<template>
  <div
    :class="[
      'relative inline-flex items-center justify-center rounded-full select-none transition-transform duration-150 hover:scale-105',
      sizeClasses[size] || sizeClasses.md,
      colorClasses,
      className,
    ]"
  >
    <span class="relative z-10 tracking-tight font-mono">{{ formattedNumber }}</span>
    <span v-if="isMatched" class="absolute inset-0 rounded-full">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F6BD51] opacity-75"></span>
    </span>
  </div>
</template>

