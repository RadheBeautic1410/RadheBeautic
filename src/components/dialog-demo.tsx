import { Button } from "@/src/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/src/components/ui/dialog"


interface DialogDemoProps {
    children: React.ReactNode;
    dialogTrigger: string;
    dialogTitle: string;
    dialogDescription: string;
    ButtonLabel?: string;
    bgColor?: any;
}

export const DialogDemo = ({
    children,
    dialogTrigger,
    dialogTitle,
    dialogDescription,
    ButtonLabel,
    bgColor,
}: DialogDemoProps) => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant={bgColor? bgColor: 'outline'}>{dialogTrigger}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                    <DialogDescription>
                        {dialogDescription}
                    </DialogDescription>
                </DialogHeader>
                {children}
                {/* <DialogFooter>
                    <Button type="submit">{ButtonLabel}</Button>
                </DialogFooter> */}
            </DialogContent>
        </Dialog>
    )
}
