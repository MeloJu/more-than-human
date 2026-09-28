-- CreateTable
CREATE TABLE "_GolpesDaForma" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GolpesDaForma_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_GolpesDaForma_B_index" ON "_GolpesDaForma"("B");

-- AddForeignKey
ALTER TABLE "_GolpesDaForma" ADD CONSTRAINT "_GolpesDaForma_A_fkey" FOREIGN KEY ("A") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GolpesDaForma" ADD CONSTRAINT "_GolpesDaForma_B_fkey" FOREIGN KEY ("B") REFERENCES "Transformation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
