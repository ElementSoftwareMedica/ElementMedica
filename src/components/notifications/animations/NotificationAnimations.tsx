/**
 * NotificationAnimations.tsx
 * 
 * Componenti e varianti Framer Motion per animazioni notifiche.
 * Include animazioni per liste, popup, badge e transizioni.
 * 
 * @module components/notifications/animations/NotificationAnimations
 * @requires framer-motion
 * @author Project 47 - Advanced Notification System
 * @since 2026-01-06
 */

import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// ============================================
// ANIMATION VARIANTS
// ============================================

/**
 * Varianti per lista notifiche con stagger
 */
export const listVariants: Variants = {
  hidden: {
    opacity: 0
  },
  visible: {
    opacity: 1,
    transition: {
      when: 'beforeChildren',
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    transition: {
      when: 'afterChildren',
      staggerChildren: 0.03,
      staggerDirection: -1
    }
  }
};

/**
 * Varianti per singolo item notifica
 */
export const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -10,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25
    }
  },
  exit: {
    opacity: 0,
    x: -100,
    transition: {
      duration: 0.2,
      ease: 'easeOut'
    }
  },
  hover: {
    scale: 1.01,
    backgroundColor: 'rgba(0, 128, 128, 0.05)',
    transition: {
      duration: 0.15
    }
  },
  tap: {
    scale: 0.99
  }
};

/**
 * Varianti per popup/dropdown
 */
export const popupVariants: Variants = {
  initial: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transformOrigin: 'top right'
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: {
      duration: 0.15,
      ease: 'easeOut'
    }
  }
};

/**
 * Varianti per badge contatore
 */
export const badgeVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 0
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 20
    }
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: {
      duration: 0.1
    }
  },
  pulse: {
    scale: [1, 1.15, 1],
    transition: {
      duration: 0.3,
      ease: 'easeInOut'
    }
  }
};

/**
 * Varianti per notifica urgente/critica
 */
export const urgentVariants: Variants = {
  initial: {
    borderColor: 'transparent'
  },
  animate: {
    borderColor: ['transparent', 'rgba(239, 68, 68, 0.5)', 'transparent'],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: 'loop'
    }
  }
};

/**
 * Varianti per icona bell
 */
export const bellVariants: Variants = {
  idle: { rotate: 0 },
  ring: {
    rotate: [0, -15, 15, -10, 10, -5, 5, 0],
    transition: {
      duration: 0.6,
      ease: 'easeInOut'
    }
  }
};

/**
 * Varianti per slide in/out
 */
export const slideVariants: Variants = {
  initial: {
    x: '100%',
    opacity: 0
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30
    }
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
};

/**
 * Varianti per fade
 */
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 }
  }
};

// ============================================
// ANIMATED COMPONENTS
// ============================================

/**
 * Lista animata di notifiche
 */
interface AnimatedNotificationListProps {
  children: React.ReactNode;
  className?: string;
}

export const AnimatedNotificationList: React.FC<AnimatedNotificationListProps> = ({
  children,
  className = ''
}) => {
  return (
    <motion.ul
      variants={listVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`divide-y divide-gray-100 ${className}`}
    >
      {children}
    </motion.ul>
  );
};

/**
 * Item singolo animato
 */
interface AnimatedNotificationItemProps {
  children: React.ReactNode;
  className?: string;
  layoutId?: string;
  onClick?: () => void;
  onAnimationComplete?: () => void;
}

export const AnimatedNotificationItem: React.FC<AnimatedNotificationItemProps> = ({
  children,
  className = '',
  layoutId,
  onClick,
  onAnimationComplete
}) => {
  return (
    <motion.li
      variants={itemVariants}
      whileHover="hover"
      whileTap="tap"
      layout={!!layoutId}
      layoutId={layoutId}
      onClick={onClick}
      onAnimationComplete={onAnimationComplete}
      className={`cursor-pointer ${className}`}
    >
      {children}
    </motion.li>
  );
};

/**
 * Dropdown/Popup animato
 */
interface AnimatedPopupProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

export const AnimatedPopup: React.FC<AnimatedPopupProps> = ({
  isOpen,
  children,
  className = ''
}) => {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          variants={popupVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Badge contatore animato
 */
interface AnimatedBadgeProps {
  count: number;
  className?: string;
  showZero?: boolean;
}

export const AnimatedBadge: React.FC<AnimatedBadgeProps> = ({
  count,
  className = '',
  showZero = false
}) => {
  const shouldShow = showZero ? count >= 0 : count > 0;
  const displayCount = count > 99 ? '99+' : count;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.span
          key={count}
          variants={badgeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={`absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center 
                      justify-center px-1 text-xs font-bold rounded-full 
                      bg-red-500 text-white ${className}`}
          aria-hidden="true"
        >
          {displayCount}
        </motion.span>
      )}
    </AnimatePresence>
  );
};

/**
 * Icona bell animata
 */
interface AnimatedBellIconProps {
  isRinging: boolean;
  children: React.ReactNode;
  className?: string;
}

export const AnimatedBellIcon: React.FC<AnimatedBellIconProps> = ({
  isRinging,
  children,
  className = ''
}) => {
  return (
    <motion.div
      variants={bellVariants}
      animate={isRinging ? 'ring' : 'idle'}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Contenitore per notifica urgente con bordo pulsante
 */
interface UrgentNotificationWrapperProps {
  isUrgent: boolean;
  children: React.ReactNode;
  className?: string;
}

export const UrgentNotificationWrapper: React.FC<UrgentNotificationWrapperProps> = ({
  isUrgent,
  children,
  className = ''
}) => {
  return (
    <motion.div
      variants={urgentVariants}
      initial="initial"
      animate={isUrgent ? 'animate' : 'initial'}
      className={`border-2 rounded-lg ${className}`}
    >
      {children}
    </motion.div>
  );
};

/**
 * Slide panel per notifiche (mobile/sidebar)
 */
interface SlideNotificationPanelProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

export const SlideNotificationPanel: React.FC<SlideNotificationPanelProps> = ({
  isOpen,
  children,
  className = '',
  onClose
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`fixed right-0 top-0 bottom-0 w-full max-w-md 
                        bg-white shadow-xl z-50 overflow-hidden ${className}`}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/**
 * Wrapper per layout transition (per riordinamento)
 */
interface LayoutTransitionWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const LayoutTransitionWrapper: React.FC<LayoutTransitionWrapperProps> = ({
  children,
  className = ''
}) => {
  return (
    <motion.div
      layout
      transition={{
        layout: {
          type: 'spring',
          stiffness: 350,
          damping: 30
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Hook per animazione su nuova notifica
 */
export const useNotificationAnimation = () => {
  const [isRinging, setIsRinging] = React.useState(false);

  const triggerRing = React.useCallback(() => {
    setIsRinging(true);
    setTimeout(() => setIsRinging(false), 600);
  }, []);

  return { isRinging, triggerRing };
};

/**
 * Varianti per skeleton loading
 */
export const skeletonVariants: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 0.8, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

/**
 * Skeleton per notifica loading
 */
export const NotificationSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <motion.div
      variants={skeletonVariants}
      initial="initial"
      animate="animate"
      className={`p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Export default con tutte le varianti
 */
export default {
  listVariants,
  itemVariants,
  popupVariants,
  badgeVariants,
  urgentVariants,
  bellVariants,
  slideVariants,
  fadeVariants,
  skeletonVariants
};
