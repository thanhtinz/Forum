/*
 * Mấy con số và luật của CHUYÊN MỤC DIỄN ĐÀN.
 *
 * Tệp này KHÔNG import gì, để bài kiểm `.mjs` nạp thẳng được — Node không giải
 * được alias `@/`. Cùng lẽ với mấy tệp `*-const.ts` khác.
 */

/** Tên chuyên mục dài nhất bấy nhiêu chữ. */
export const TEN_TOI_DA = 60;

/**
 * Mô tả dài nhất bấy nhiêu chữ.
 *
 * Một dòng, và đúng là một dòng: bảng chuyên mục xếp mỗi mục một hàng, mô tả
 * tràn sang dòng thứ ba là cả bảng cao gấp đôi mà chẳng nói thêm được gì —
 * chỗ nói dài là bên trong chuyên mục, không phải ở bảng mục lục.
 */
export const MO_TA_TOI_DA = 160;

/** Bày nhiều nhất bấy nhiêu chuyên mục. Quá số này thì bảng thành cái danh bạ. */
export const CHUYEN_MUC_TOI_DA = 30;

/**
 * Mã của mục "Chung" dựng sẵn — chỗ đứng của mấy chủ đề chưa xếp mục nào.
 *
 * KHÔNG phải một hàng trong cơ sở dữ liệu: quản trị không sửa được nó, không
 * xoá được nó, và nó phải có mặt kể cả khi cửa hàng chưa dựng chuyên mục nào.
 * Mọi chủ đề mở trước đợt này đều nằm ở đây, nên nếu giấu đi thì cả diễn đàn
 * cũ biến mất khỏi bảng mục lục.
 */
export const MUC_CHUNG = 'chung';

export const TEN_MUC_CHUNG = 'Chung';
export const MO_TA_MUC_CHUNG = 'Chuyện chưa xếp vào mục nào';
