-- El cliente ve el nombre real del archivo que subió (ej: "plano_final.dwg")
-- en vez del nombre generado en disco. Se guarda por separado de file_url
-- (que sigue siendo el nombre físico/único usado para servir el archivo).
ALTER TABLE "order_files" ADD COLUMN "original_name" TEXT;
