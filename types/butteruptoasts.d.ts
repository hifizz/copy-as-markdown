// types/butteruptoasts.d.ts
declare module 'butteruptoasts' {
  /**
   * 配置选项，用于创建 Toast 通知。
   */
  interface ToastOptions {
    /** Toast 的标题 (可选) */
    title?: string;
    /** Toast 的主要消息内容 (必需) */
    message: string;
    /**
     * Toast 的预设类型，影响样式和默认图标 (可选)
     * 'success', 'error', 'warning', 'info'
     */
    type?: 'success' | 'error' | 'warning' | 'info';
    /**
     * Toast 显示的位置 (可选, 默认为 'top-right')
     * 'top-right', 'top-left', 'top-center', 'bottom-right', 'bottom-left', 'bottom-center'
     */
    location?: 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';
    /**
     * 是否显示预设图标 (可选, 仅当设置了 `type` 时生效)
     * 如果为 `true`，将根据 `type` 显示对应的 SVG 图标。
     */
    icon?: boolean;
    /**
     * Toast 的预设主题 (可选)
     * 'glass', 'brutalist'
     */
    theme?: 'glass' | 'brutalist';
    /**
     * 自定义图标的 SVG 代码字符串 (可选)
     * 如果提供，将覆盖 `icon: true` 和 `type` 对应的默认图标。
     */
    customIcon?: string;
    /**
     * 是否允许用户点击 Toast 来关闭它 (可选)
     */
    dismissable?: boolean;
    /**
     * Toast 被点击时的回调函数 (可选)
     * @param event 鼠标事件对象
     */
    onClick?: (event: MouseEvent) => void;
    /**
     * Toast 渲染完成时的回调函数 (可选)
     * @param toastElement 创建的 Toast 的 HTMLLIElement
     */
    onRender?: (toastElement: HTMLLIElement) => void;
    /**
     * Toast 因超时而即将关闭时的回调函数 (可选)
     * @param toastElement 即将关闭的 Toast 的 HTMLLIElement
     */
    onTimeout?: (toastElement: HTMLLIElement) => void;
    /**
     * 自定义的 HTML 内容字符串，将插入到 Toast 描述区域 (可选)
     * 会添加到 `message` 内容之后。
     */
    customHTML?: string;
    /**
     * 主要按钮的配置 (可选)
     */
    primaryButton?: {
      /** 按钮上显示的文本 */
      text: string;
      /** 按钮点击时的回调函数 */
      onClick: (event: MouseEvent) => void;
    };
    /**
     * 次要按钮的配置 (可选)
     */
    secondaryButton?: {
      /** 按钮上显示的文本 */
      text: string;
      /** 按钮点击时的回调函数 */
      onClick: (event: MouseEvent) => void;
    };
  }

  /**
   * Butterup 库的接口定义。
   */
  interface Butterup {
    /**
     * 全局配置选项。
     */
    options: {
      /** 最大同时显示的 Toast 数量 (默认 5) */
      maxToasts: number;
      /** Toast 默认显示时间 (毫秒, 默认 35000 - 源码中似乎是 35000 而非文档中的 5000) */
      toastLife: number;
      /** 当前屏幕上的 Toast 数量 (内部状态) */
      readonly currentToasts: number;
      /** 是否启用堆叠效果 (默认 false) */
      stackedToasts: boolean;
    };
    /**
     * 显示一个 Toast 通知。
     * @param options Toast 的配置选项，详见 `ToastOptions` 接口。
     */
    toast: (options: ToastOptions) => void;
    /**
     * (内部方法) 用于移除指定的 Toast。
     * @param toastId 要移除的 Toast 的 ID (例如 'butterupToast-1')
     * @param onClosed 可选的回调函数，在 Toast 动画结束并从 DOM 移除后调用。
     */
    // despawnToast: (toastId: string, onClosed?: (toastElement: HTMLLIElement) => void) => void; // Internal method, usually not called directly
  }

  /**
   * Butterup 库的实例。
   */
  const butterup: Butterup;
  export default butterup;
}
