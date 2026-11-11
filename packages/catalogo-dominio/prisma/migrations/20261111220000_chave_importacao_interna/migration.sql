-- DropIndex
DROP INDEX "Produto_chaveImportacao_key";

-- AlterTable
ALTER TABLE "Produto" DROP COLUMN "chaveImportacao";

-- AlterTable
ALTER TABLE "ProdutoInterno" ADD COLUMN     "chaveImportacao" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProdutoInterno_chaveImportacao_key" ON "ProdutoInterno"("chaveImportacao");

