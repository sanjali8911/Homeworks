import java.util.*;
public class Arrays {
  public static void main(String args[]) {
    Scanner sc = new Scanner(System.in);
    int n = sc.nextInt(); //row number
    int m = sc.nextInt(); //col number
    System.out.println("The Spiral Order matrix is: ");
    int matrix[][] = new int[n][m];
    for (int i=0; i<n; i++){
      for(int j=0; j<m; j++) {
        matrix[i][j] = sc.nextInt();
      }
    }
   int row_Start = 0;
   int col_Start = 0;
   int col_end = m-1;
   int row_end = n-1;
   // To print the spiral  order matrix
   while(row_Start <= row_end && col_Start <= col_end) {
//1
for (int col = col_Start; col<=col_end; col++) {
  System.out.print(matrix[row_Start][col] + " ");
} System.out.println();
row_Start++;
//2
for (int row = row_Start; row<=row_end; row++) {
  System.out.print(matrix[row][col_end]+ " ");
} System.out.println();
col_end--;










System.out.println();
   //}
  }
    
}
}