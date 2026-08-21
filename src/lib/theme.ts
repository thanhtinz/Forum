export const THEME_STORAGE_KEY = 'nova-theme';

/**
 * Script chạy trước khi vẽ trang: đặt lớp `.dark` theo lựa chọn đã lưu
 * (hoặc theo thiết lập hệ điều hành) để không chớp trắng khi ở chế độ tối.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k='${THEME_STORAGE_KEY}';var t=localStorage.getItem(k);if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark'){document.documentElement.classList.add('dark')}document.documentElement.style.colorScheme=t}catch(e){}})();`;
