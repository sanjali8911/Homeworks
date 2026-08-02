import java.util.*;
public class ovvo {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("Welcome to the menu driven program\nPress 1 to start, enter student marks \nPress 0 to opt out\n" );

        // int m = sc.nextInt();
        // for (int a =0; 2*a<m; a++) {
        //     System.out.println(2*a);
        // }
       int input = sc.nextInt(); 
        int bin; 
        //bin=marks
        do{ if (input ==1) {bin = sc.nextInt(); if (bin>0 && bin<=59) {System.out.println("Padhai kar lo beta");}
            else if (bin>59 && bin<=89) {System.out.println("Aww olelele practice");}
            else if (bin>=90) {System.out.println("Astonishing");}
            ; input = sc.nextInt();} } while( input != 0); 
            System.out.println("Thank You");
    }
}
